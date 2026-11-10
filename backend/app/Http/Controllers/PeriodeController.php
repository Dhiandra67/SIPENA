<?php

namespace App\Http\Controllers;

use App\Models\AnggotaKelas;
use App\Models\Kelas;
use App\Models\KomponenNilai;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\RentangNilai;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PeriodeController extends Controller
{
    public function index(): JsonResponse
    {
        $periods = PeriodeAkademik::orderByDesc('is_active')
            ->orderByDesc('tanggal_mulai')
            ->get()
            ->map(fn (PeriodeAkademik $p) => $this->formatPeriode($p));

        return response()->json(['data' => $periods]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatePeriode($request);

        $periode = DB::transaction(function () use ($payload): PeriodeAkademik {
            if ($payload['is_active']) {
                PeriodeAkademik::query()->update(['is_active' => false]);
            }

            $created = PeriodeAkademik::create($payload);

            $defaultRanges = [
                ['predikat' => 'A', 'batas_bawah' => 85.00, 'batas_atas' => 100.00, 'keterangan' => 'Sangat Baik'],
                ['predikat' => 'B', 'batas_bawah' => 70.00, 'batas_atas' => 84.99, 'keterangan' => 'Baik'],
                ['predikat' => 'C', 'batas_bawah' => 55.00, 'batas_atas' => 69.99, 'keterangan' => 'Cukup'],
                ['predikat' => 'D', 'batas_bawah' => 0.00, 'batas_atas' => 54.99, 'keterangan' => 'Perlu Bimbingan'],
            ];

            foreach ($defaultRanges as $range) {
                RentangNilai::firstOrCreate(
                    [
                        'periode_id' => $created->id,
                        'predikat' => $range['predikat'],
                    ],
                    [
                        'batas_bawah' => $range['batas_bawah'],
                        'batas_atas' => $range['batas_atas'],
                        'keterangan' => $range['keterangan'],
                    ]
                );
            }

            return $created;
        });

        return response()->json([
            'message' => 'Periode akademik berhasil ditambahkan beserta rentang nilai standar.',
            'data' => $this->formatPeriode($periode),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $periode = PeriodeAkademik::findOrFail($id);
        $payload = $this->validatePeriode($request, $periode->id);

        if ($periode->is_active && ! $payload['is_active']) {
            return response()->json([
                'message' => 'Periode aktif tidak dapat dinonaktifkan secara langsung. Aktifkan periode lain terlebih dahulu.',
            ], 422);
        }

        DB::transaction(function () use ($periode, $payload): void {
            if ($payload['is_active']) {
                PeriodeAkademik::where('id', '!=', $periode->id)->update(['is_active' => false]);
            }

            $periode->update($payload);
        });

        return response()->json([
            'message' => 'Periode akademik berhasil diperbarui.',
            'data' => $this->formatPeriode($periode->fresh()),
        ]);
    }

    public function activate(int $id): JsonResponse
    {
        $periode = PeriodeAkademik::findOrFail($id);

        DB::transaction(function () use ($periode): void {
            PeriodeAkademik::where('id', '!=', $periode->id)->update(['is_active' => false]);
            $periode->update(['is_active' => true]);
        });

        return response()->json([
            'message' => 'Periode akademik berhasil diaktifkan.',
            'data' => $this->formatPeriode($periode->fresh()),
        ]);
    }

    public function copyFromPeriode(Request $request, int $id): JsonResponse
    {
        $targetPeriode = PeriodeAkademik::findOrFail($id);

        $sourcePeriode = null;
        if ($request->filled('source_periode_id')) {
            $sourcePeriode = PeriodeAkademik::find($request->input('source_periode_id'));
        } elseif ($request->filled('source_period')) {
            $sourcePeriode = PeriodeAkademik::where('nama_periode', trim((string) $request->input('source_period')))->first();
        } else {
            $sourcePeriode = PeriodeAkademik::where('id', '!=', $targetPeriode->id)
                ->orderByDesc('is_active')
                ->orderByDesc('tanggal_mulai')
                ->first();
        }

        if (! $sourcePeriode || $sourcePeriode->id === $targetPeriode->id) {
            return response()->json([
                'message' => 'Periode sumber yang valid untuk penyalinan tidak ditemukan.',
            ], 422);
        }

        $mode = strtolower(trim((string) ($request->input('mode') ?? 'same_class')));
        $promoteLevel = $mode === 'promote_level';
        $copyAssignments = (bool) $request->boolean('copy_assignments', true);

        $sourceClasses = Kelas::with(['anggotaKelas.siswa'])
            ->where('periode_id', $sourcePeriode->id)
            ->get();

        if ($sourceClasses->isEmpty()) {
            return response()->json([
                'message' => "Periode sumber ({$sourcePeriode->nama_periode}) belum memiliki data kelas untuk disalin.",
            ], 422);
        }

        $copiedClassCount = 0;
        $copiedStudentCount = 0;
        $copiedAssignmentCount = 0;

        DB::transaction(function () use (
            $sourcePeriode,
            $targetPeriode,
            $sourceClasses,
            $promoteLevel,
            $copyAssignments,
            &$copiedClassCount,
            &$copiedStudentCount,
            &$copiedAssignmentCount
        ): void {
            $classIdMap = [];

            foreach ($sourceClasses as $srcKelas) {
                $targetTingkat = $srcKelas->tingkat;
                $targetKode = $srcKelas->kode_kelas;
                $targetNama = $srcKelas->nama_kelas;

                if ($promoteLevel) {
                    if ($srcKelas->tingkat === 'IX') {
                        // Kelas IX tidak dipromosikan ke tingkat di atasnya pada jenjang SMP
                        continue;
                    }
                    if ($srcKelas->tingkat === 'VII') {
                        $targetTingkat = 'VIII';
                        $targetKode = (string) preg_replace('/^VII\b/i', 'VIII', $srcKelas->kode_kelas);
                        $targetNama = (string) preg_replace('/^VII\b/i', 'VIII', $srcKelas->nama_kelas);
                    } elseif ($srcKelas->tingkat === 'VIII') {
                        $targetTingkat = 'IX';
                        $targetKode = (string) preg_replace('/^VIII\b/i', 'IX', $srcKelas->kode_kelas);
                        $targetNama = (string) preg_replace('/^VIII\b/i', 'IX', $srcKelas->nama_kelas);
                    }
                }

                $destKelas = Kelas::firstOrCreate(
                    [
                        'periode_id' => $targetPeriode->id,
                        'kode_kelas' => $targetKode,
                    ],
                    [
                        'wali_kelas_id' => $srcKelas->wali_kelas_id,
                        'nama_kelas' => $targetNama,
                        'tingkat' => $targetTingkat,
                    ]
                );

                $copiedClassCount++;
                $classIdMap[$srcKelas->id] = $destKelas->id;

                foreach ($srcKelas->anggotaKelas as $anggota) {
                    $siswa = $anggota->siswa;
                    if (! $siswa || strtoupper((string) $siswa->status) !== 'AKTIF') {
                        continue;
                    }

                    AnggotaKelas::firstOrCreate([
                        'kelas_id' => $destKelas->id,
                        'siswa_id' => $siswa->id,
                    ]);
                    $copiedStudentCount++;
                }
            }

            if ($copyAssignments && $classIdMap !== []) {
                $sourceAssignments = Pengajaran::with('komponenNilai')
                    ->where('periode_id', $sourcePeriode->id)
                    ->whereIn('kelas_id', array_keys($classIdMap))
                    ->get();

                foreach ($sourceAssignments as $srcPengajaran) {
                    $destKelasId = $classIdMap[$srcPengajaran->kelas_id] ?? null;
                    if (! $destKelasId) {
                        continue;
                    }

                    $destPengajaran = Pengajaran::firstOrCreate(
                        [
                            'periode_id' => $targetPeriode->id,
                            'kelas_id' => $destKelasId,
                            'mapel_id' => $srcPengajaran->mapel_id,
                        ],
                        [
                            'guru_id' => $srcPengajaran->guru_id,
                            'kkm' => $srcPengajaran->kkm,
                            'is_locked' => false,
                        ]
                    );

                    if ($destPengajaran->komponenNilai()->count() === 0) {
                        foreach ($srcPengajaran->komponenNilai as $comp) {
                            KomponenNilai::create([
                                'pengajaran_id' => $destPengajaran->id,
                                'nama_komponen' => $comp->nama_komponen,
                                'bobot_persen' => $comp->bobot_persen,
                                'urutan' => $comp->urutan,
                            ]);
                        }
                    }

                    $copiedAssignmentCount++;
                }
            }
        });

        $actionLabel = $promoteLevel ? 'Promosi kenaikan tingkat kelas' : 'Transisi salin kelas & siswa';

        return response()->json([
            'message' => "{$actionLabel} dari {$sourcePeriode->nama_periode} ke {$targetPeriode->nama_periode} berhasil: {$copiedClassCount} kelas, {$copiedStudentCount} anggota siswa, dan {$copiedAssignmentCount} penugasan disinkronkan.",
            'data' => [
                'copiedClasses' => $copiedClassCount,
                'copiedStudents' => $copiedStudentCount,
                'copiedAssignments' => $copiedAssignmentCount,
            ],
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $periode = PeriodeAkademik::withCount(['kelas', 'pengajaran'])->findOrFail($id);

        if ($periode->is_active) {
            return response()->json([
                'message' => 'Periode aktif tidak dapat dihapus. Aktifkan periode lain terlebih dahulu.',
            ], 422);
        }

        if ($periode->kelas_count > 0 || $periode->pengajaran_count > 0) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        $periode->delete();

        return response()->json(['message' => 'Periode akademik berhasil dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatPeriode(PeriodeAkademik $p): array
    {
        return [
            'id' => (string) $p->id,
            'name' => $p->nama_periode,
            'nama_periode' => $p->nama_periode,
            'tahun_ajaran' => $p->tahun_ajaran,
            'semester' => $p->semester,
            'startDate' => $p->tanggal_mulai?->format('Y-m-d') ?? '',
            'endDate' => $p->tanggal_selesai?->format('Y-m-d') ?? '',
            'tanggal_mulai' => $p->tanggal_mulai?->format('Y-m-d') ?? '',
            'tanggal_selesai' => $p->tanggal_selesai?->format('Y-m-d') ?? '',
            'is_active' => (bool) $p->is_active,
            'status' => $p->is_active ? 'Aktif' : 'Tidak aktif',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePeriode(Request $request, ?int $ignoreId = null): array
    {
        $namaPeriode = trim((string) ($request->input('nama_periode') ?? $request->input('name') ?? ''));
        if ($namaPeriode === '' && $request->filled('year') && $request->filled('semester')) {
            $namaPeriode = trim((string) $request->input('year')).' · '.ucfirst(strtolower(trim((string) $request->input('semester'))));
        }
        $tanggalMulai = (string) ($request->input('tanggal_mulai') ?? $request->input('startDate') ?? $request->input('start') ?? '');
        $tanggalSelesai = (string) ($request->input('tanggal_selesai') ?? $request->input('endDate') ?? $request->input('end') ?? '');

        $request->merge([
            'nama_periode_resolved' => $namaPeriode,
            'tanggal_mulai_resolved' => $tanggalMulai,
            'tanggal_selesai_resolved' => $tanggalSelesai,
        ]);

        $request->validate([
            'nama_periode_resolved' => ['required', 'string', 'max:50'],
            'tanggal_mulai_resolved' => ['required', 'date'],
            'tanggal_selesai_resolved' => ['required', 'date', 'after:tanggal_mulai_resolved'],
        ], [
            'tanggal_selesai_resolved.after' => 'Tanggal selesai harus setelah tanggal mulai.',
        ]);

        $duplicateQuery = PeriodeAkademik::whereRaw('LOWER(nama_periode) = ?', [strtolower($namaPeriode)]);
        if ($ignoreId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreId);
        }
        if ($duplicateQuery->exists()) {
            abort(response()->json(['message' => 'Nama periode sudah terdaftar.'], 422));
        }

        $tahunAjaran = trim((string) ($request->input('tahun_ajaran') ?? ''));
        $semester = strtoupper(trim((string) ($request->input('semester') ?? '')));

        if ($tahunAjaran === '' || ! in_array($semester, ['GANJIL', 'GENAP'], true)) {
            if (preg_match('/(\d{4}\/\d{4})/', $namaPeriode, $matches)) {
                $tahunAjaran = $matches[1];
            } else {
                $tahunAjaran = substr($namaPeriode, 0, 20);
            }
            $semester = stripos($namaPeriode, 'genap') !== false ? 'GENAP' : 'GANJIL';
        }

        $statusInput = $request->input('status');
        $isActive = $request->has('is_active')
            ? (bool) $request->boolean('is_active')
            : (is_string($statusInput) && strtolower(trim($statusInput)) === 'aktif');

        return [
            'tahun_ajaran' => $tahunAjaran,
            'semester' => $semester,
            'nama_periode' => $namaPeriode,
            'tanggal_mulai' => $tanggalMulai,
            'tanggal_selesai' => $tanggalSelesai,
            'is_active' => $isActive,
        ];
    }
}

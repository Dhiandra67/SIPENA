<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\KomponenNilai;
use App\Models\MataPelajaran;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\RentangNilai;
use App\Models\Siswa;
use App\Services\GradeCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengajaranController extends Controller
{
    public function __construct(
        private readonly GradeCalculationService $gradeService
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Pengajaran::with(['guru', 'gurus', 'mataPelajaran', 'kelas.anggotaKelas', 'periode'])
            ->withCount('nilaiAkhirMapel')
            ->orderBy('id');

        if ($user && in_array(strtolower((string) $user->role), ['teacher', 'guru', 'role_guru'], true)) {
            $guru = Guru::where('user_id', $user->id)->first();
            if (! $guru) {
                return response()->json(['data' => []]);
            }
            $query->whereHas('gurus', fn ($q) => $q->where('guru.id', $guru->id));
        }

        if ($request->filled('periode_id')) {
            $query->where('periode_id', (int) $request->input('periode_id'));
        }

        $items = $query->get()->map(fn (Pengajaran $p) => $this->formatPengajaran($p));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatePengajaran($request);

        $result = DB::transaction(function () use ($payload): array {
            $guruIds = $payload['guru_ids'];
            unset($payload['guru_ids']);

            $identity = [
                'periode_id' => $payload['periode_id'],
                'kelas_id' => $payload['kelas_id'],
                'mapel_id' => $payload['mapel_id'],
            ];
            $pengajaran = Pengajaran::where($identity)->first();

            if ($pengajaran) {
                $pengajaran->loadMissing('gurus');
                $existingGuruIds = $pengajaran->gurus->modelKeys();
                $addedGuruIds = array_values(array_diff($guruIds, $existingGuruIds));
                $attachGuruIds = array_values(array_unique(array_merge(
                    $existingGuruIds,
                    $guruIds,
                    $pengajaran->guru_id ? [$pengajaran->guru_id] : [],
                )));
                $pengajaran->gurus()->syncWithoutDetaching($attachGuruIds);

                return [
                    'pengajaran' => $pengajaran,
                    'added_guru_ids' => $addedGuruIds,
                    'was_created' => false,
                ];
            }

            $created = Pengajaran::create($payload);
            $created->gurus()->syncWithoutDetaching($guruIds);

            $defaultComponents = [
                ['nama_komponen' => 'Tugas Harian', 'bobot_persen' => 20.00, 'urutan' => 1],
                ['nama_komponen' => 'Ulangan Harian', 'bobot_persen' => 25.00, 'urutan' => 2],
                ['nama_komponen' => 'STS', 'bobot_persen' => 25.00, 'urutan' => 3],
                ['nama_komponen' => 'UAS', 'bobot_persen' => 30.00, 'urutan' => 4],
            ];

            foreach ($defaultComponents as $comp) {
                KomponenNilai::create([
                    'pengajaran_id' => $created->id,
                    'nama_komponen' => $comp['nama_komponen'],
                    'bobot_persen' => $comp['bobot_persen'],
                    'urutan' => $comp['urutan'],
                ]);
            }

            return [
                'pengajaran' => $created,
                'added_guru_ids' => $guruIds,
                'was_created' => true,
            ];
        });

        $pengajaran = $result['pengajaran'];
        $pengajaran->load(['guru', 'gurus', 'mataPelajaran', 'kelas.anggotaKelas', 'periode'])->loadCount('nilaiAkhirMapel');

        $message = $result['was_created']
            ? 'Penugasan pengajaran berhasil ditambahkan.'
            : ($result['added_guru_ids'] === []
                ? 'Guru yang dipilih sudah terdaftar pada penugasan mata pelajaran ini.'
                : 'Guru baru berhasil ditambahkan ke penugasan mata pelajaran yang sudah ada.');

        return response()->json([
            'message' => $message,
            'data' => $this->formatPengajaran($pengajaran),
        ], $result['was_created'] ? 201 : 200);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pengajaran = Pengajaran::findOrFail($id);
        $payload = $this->validatePengajaran($request, $pengajaran->id, $pengajaran);

        DB::transaction(function () use ($pengajaran, $payload): void {
            $guruIds = $payload['guru_ids'];
            unset($payload['guru_ids']);
            $pengajaran->update($payload);
            $pengajaran->gurus()->syncWithoutDetaching($guruIds);
            $this->gradeService->recalculateForPengajaran($pengajaran);
        });

        $pengajaran->load(['guru', 'gurus', 'mataPelajaran', 'kelas.anggotaKelas', 'periode'])->loadCount('nilaiAkhirMapel');

        return response()->json([
            'message' => 'Penugasan pengajaran berhasil diperbarui.',
            'data' => $this->formatPengajaran($pengajaran),
        ]);
    }

    public function toggleLock(int $id): JsonResponse
    {
        $pengajaran = Pengajaran::with(['guru', 'gurus', 'mataPelajaran', 'kelas.anggotaKelas', 'periode'])
            ->withCount('nilaiAkhirMapel')
            ->findOrFail($id);

        $pengajaran->update([
            'is_locked' => ! $pengajaran->is_locked,
        ]);

        $statusText = $pengajaran->is_locked ? 'dikunci' : 'dibuka kembali';

        return response()->json([
            'message' => "Pengisian nilai {$pengajaran->mataPelajaran?->nama_mapel} ({$pengajaran->kelas?->nama_kelas}) berhasil {$statusText}.",
            'data' => $this->formatPengajaran($pengajaran),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $pengajaran = Pengajaran::findOrFail($id);
        $pengajaran->delete();

        return response()->json(['message' => 'Penugasan pengajaran berhasil dihapus.']);
    }

    /**
     * Mengembalikan seluruh dataset master untuk AdminPanel dalam satu request cepat.
     */
    public function overview(
        PeriodeController $periodeController,
        RentangNilaiController $rentangController,
        MataPelajaranController $mapelController,
        KelasController $kelasController,
        GuruController $guruController,
        SiswaController $siswaController,
    ): JsonResponse {
        $periodeAktif = PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();

        $academic = PeriodeAkademik::orderBy('tahun_ajaran')
            ->orderByRaw("CASE WHEN semester = 'GANJIL' THEN 1 ELSE 2 END")
            ->get()
            ->map(fn (PeriodeAkademik $p) => $periodeController->formatPeriode($p))
            ->values();

        $grades = RentangNilai::with('periode')
            ->orderByDesc('periode_id')
            ->orderByDesc('batas_bawah')
            ->get()
            ->map(fn (RentangNilai $r) => $rentangController->formatRentang($r))
            ->values();

        $subjects = MataPelajaran::with('periodeAkademik')
            ->orderBy('kode_mapel')
            ->get()
            ->flatMap(function (MataPelajaran $m) use ($mapelController) {
                return $m->periodeAkademik->map(
                    fn (PeriodeAkademik $p) => $mapelController->formatMapel($m, $p->nama_periode)
                );
            })
            ->values();

        $classes = Kelas::with(['periode', 'waliKelas'])
            ->withCount('anggotaKelas')
            ->orderBy('kode_kelas')
            ->get()
            ->map(fn (Kelas $k) => $kelasController->formatKelas($k))
            ->values();

        $teachers = Guru::with(['user', 'periodeAkademik'])
            ->orderBy('nama_lengkap')
            ->get()
            ->flatMap(function (Guru $g) use ($guruController) {
                return $g->periodeAkademik->map(
                    fn (PeriodeAkademik $p) => $guruController->formatGuru($g, $p->nama_periode)
                );
            })
            ->values();

        $students = Siswa::with(['anggotaKelas.kelas.periode'])
            ->orderBy('nis')
            ->get()
            ->flatMap(function (Siswa $s) use ($siswaController) {
                $periodIds = $s->anggotaKelas
                    ->map(fn ($ak) => $ak->kelas?->periode_id)
                    ->filter()
                    ->unique()
                    ->values();

                return $periodIds->map(fn (int $pid) => $siswaController->formatSiswa($s, $pid));
            })
            ->values();

        $assignments = Pengajaran::with(['guru', 'gurus', 'mataPelajaran', 'kelas.anggotaKelas', 'periode'])
            ->withCount('nilaiAkhirMapel')
            ->orderBy('id')
            ->get()
            ->map(fn (Pengajaran $p) => $this->formatPengajaran($p))
            ->values();

        return response()->json([
            'data' => [
                'academic' => $academic,
                'grades' => $grades,
                'subjects' => $subjects,
                'classes' => $classes,
                'teachers' => $teachers,
                'students' => $students,
                'assignments' => $assignments,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatPengajaran(Pengajaran $p): array
    {
        $kkm = rtrim(rtrim(number_format((float) $p->kkm, 2, '.', ''), '0'), '.');
        $totalStudents = $p->kelas
            ? ($p->kelas->relationLoaded('anggotaKelas')
                ? $p->kelas->anggotaKelas->count()
                : $p->kelas->anggotaKelas()->count())
            : 0;
        $completedCount = (int) ($p->nilai_akhir_mapel_count ?? $p->nilaiAkhirMapel()->count());
        $isLocked = (bool) $p->is_locked;

        return [
            'id' => (string) $p->id,
            'periode_id' => (string) $p->periode_id,
            'kelas_id' => (string) $p->kelas_id,
            'mapel_id' => (string) $p->mapel_id,
            'guru_id' => (string) $p->guru_id,
            'teacher' => $p->gurus->pluck('nama_lengkap')->implode(' | ') ?: ($p->guru?->nama_lengkap ?? ''),
            'subject' => $p->mataPelajaran?->nama_mapel ?? '',
            'className' => $p->kelas?->nama_kelas ?? '',
            'period' => $p->periode?->nama_periode ?? '',
            'kkm' => $kkm,
            'progress' => "{$completedCount}/{$totalStudents} siswa",
            'lockStatus' => $isLocked ? 'Terkunci' : 'Terbuka',
            'is_locked' => $isLocked,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePengajaran(Request $request, ?int $ignoreId = null, ?Pengajaran $existing = null): array
    {
        $periode = null;
        if ($request->filled('periode_id')) {
            $periode = PeriodeAkademik::find($request->input('periode_id'));
        } elseif ($request->filled('period')) {
            $periode = PeriodeAkademik::where('nama_periode', trim((string) $request->input('period')))->first();
        }
        $periode ??= PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();

        if (! $periode) {
            abort(response()->json(['message' => 'Periode akademik belum tersedia.'], 422));
        }

        if ($request->has('guru_ids')) {
            $rawGuruIds = $request->input('guru_ids');
            if (! is_array($rawGuruIds) || $rawGuruIds === []) {
                abort(response()->json(['message' => 'Pilih minimal satu guru pengampu.'], 422));
            }
            $guruIds = array_map('intval', $rawGuruIds);
            if (count($guruIds) !== count(array_unique($guruIds))) {
                abort(response()->json(['message' => 'Guru pengampu tidak boleh dipilih lebih dari satu kali.'], 422));
            }
        } else {
            $guru = null;
            $hasTeacherInput = $request->filled('guru_id') || $request->filled('teacher');
            if ($request->filled('guru_id')) {
                $guru = Guru::find($request->input('guru_id'));
            } elseif ($request->filled('teacher')) {
                $guru = Guru::where('nama_lengkap', trim((string) $request->input('teacher')))->first();
            }
            if ($hasTeacherInput && ! $guru) {
                $guruIds = [];
            } elseif (! $hasTeacherInput && $existing) {
                $existing->loadMissing('gurus');
                $guruIds = $existing->gurus->modelKeys();
            } elseif ($guru) {
                $guruIds = [$guru->id];
            } else {
                $guruIds = [];
            }
        }

        $matchedGuruCount = Guru::whereIn('id', $guruIds)->count();
        if ($guruIds === [] || $matchedGuruCount !== count($guruIds)) {
            abort(response()->json(['message' => 'Pilih guru yang terdaftar.'], 422));
        }

        $mapel = null;
        if ($request->filled('mapel_id')) {
            $mapel = MataPelajaran::find($request->input('mapel_id'));
        } elseif ($request->filled('subject')) {
            $mapel = MataPelajaran::where('nama_mapel', trim((string) $request->input('subject')))->first();
        }
        if (! $mapel) {
            abort(response()->json(['message' => 'Pilih mata pelajaran yang terdaftar.'], 422));
        }

        $kelas = null;
        if ($request->filled('kelas_id')) {
            $kelas = Kelas::where('periode_id', $periode->id)->find($request->input('kelas_id'));
        } elseif ($request->filled('className')) {
            $className = trim((string) $request->input('className'));
            $kelas = Kelas::where('periode_id', $periode->id)
                ->where(function ($q) use ($className) {
                    $q->where('nama_kelas', $className)->orWhere('kode_kelas', $className);
                })
                ->first();
        }
        if (! $kelas) {
            abort(response()->json(['message' => 'Pilih kelas yang terdaftar pada periode penugasan.'], 422));
        }

        $kkmRaw = $request->input('kkm') ?? $mapel->kkm_default ?? 75;
        if (! is_numeric($kkmRaw) || (float) $kkmRaw < 0 || (float) $kkmRaw > 100) {
            abort(response()->json(['message' => 'KKM pengajaran harus berada pada rentang 0–100.'], 422));
        }

        $isLocked = $request->has('is_locked')
            ? (bool) $request->boolean('is_locked')
            : ($existing !== null ? (bool) $existing->is_locked : false);

        return [
            'periode_id' => $periode->id,
            'kelas_id' => $kelas->id,
            'mapel_id' => $mapel->id,
            'guru_id' => $guruIds[0],
            'guru_ids' => $guruIds,
            'kkm' => round((float) $kkmRaw, 2),
            'is_locked' => $isLocked,
        ];
    }
}

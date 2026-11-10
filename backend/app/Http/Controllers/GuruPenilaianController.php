<?php

namespace App\Http\Controllers;

use App\Models\AnggotaKelas;
use App\Models\Guru;
use App\Models\KomponenNilai;
use App\Models\NilaiAkhirMapel;
use App\Models\NilaiDetail;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Services\GradeCalculationService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GuruPenilaianController extends Controller
{
    public function __construct(
        private readonly GradeCalculationService $gradeService
    ) {}

    public function dashboard(Request $request): JsonResponse
    {
        $resolvedPeriode = $this->resolveSelectedPeriode($request);
        $pengajaranList = $this->resolveTeacherPengajaranList($request, $resolvedPeriode);

        return response()->json([
            'data' => $this->buildTeacherWorkspacePayload($pengajaranList, $resolvedPeriode),
        ]);
    }

    public function pengajaranSaya(Request $request): JsonResponse
    {
        $resolvedPeriode = $this->resolveSelectedPeriode($request);
        $pengajaranList = $this->resolveTeacherPengajaranList($request, $resolvedPeriode);
        $payload = $this->buildTeacherWorkspacePayload($pengajaranList, $resolvedPeriode);

        return response()->json([
            'data' => $payload['assignments'],
            'meta' => $payload,
        ]);
    }

    public function detailPengajaran(Request $request, int $id): JsonResponse
    {
        $pengajaran = $this->findAuthorizedPengajaran($request, $id);
        $payload = $this->buildTeacherWorkspacePayload(new Collection([$pengajaran]));

        return response()->json([
            'data' => $payload['assignments'][0] ?? null,
            'components' => $payload['componentsByAssignment'][(string) $pengajaran->id] ?? [],
            'scores' => $payload['scores'],
            'statistics' => $this->gradeService->calculateStatistics($pengajaran),
        ]);
    }

    public function getKomponen(Request $request, int $id): JsonResponse
    {
        $pengajaran = $this->findAuthorizedPengajaran($request, $id);
        $components = $pengajaran->komponenNilai()
            ->orderBy('urutan')
            ->get()
            ->map(fn (KomponenNilai $k) => $this->formatKomponen($k))
            ->values();

        return response()->json(['data' => $components]);
    }

    public function updateKomponen(Request $request, string $id): JsonResponse
    {
        $rawComponents = $request->input('components');
        if (! is_array($rawComponents) || $rawComponents === []) {
            return response()->json([
                'message' => 'Pengajaran harus memiliki minimal satu komponen penilaian.',
            ], 422);
        }

        $normalized = [];
        foreach ($rawComponents as $index => $comp) {
            $name = trim((string) ($comp['nama_komponen'] ?? $comp['name'] ?? ''));
            $weightRaw = $comp['bobot_persen'] ?? $comp['weight'] ?? null;

            if ($name === '') {
                return response()->json(['message' => 'Nama setiap komponen harus diisi.'], 422);
            }
            if (! is_numeric($weightRaw)) {
                return response()->json(['message' => 'Bobot komponen harus berupa angka.'], 422);
            }

            $normalized[] = [
                'id' => isset($comp['id']) && is_numeric($comp['id']) ? (int) $comp['id'] : null,
                'nama_komponen' => $name,
                'bobot_persen' => round((float) $weightRaw, 2),
                'urutan' => $index + 1,
            ];
        }

        if (! $this->gradeService->hasValidWeights($normalized)) {
            return response()->json([
                'message' => 'Total bobot harus tepat 100% dan setiap bobot lebih dari 0%.',
            ], 422);
        }

        $targets = $id === 'all'
            ? $this->resolveTeacherPengajaranList($request)
            : new Collection([$this->findAuthorizedPengajaran($request, (int) $id)]);

        if ($targets->isEmpty()) {
            return response()->json(['message' => 'Pengajaran tidak ditemukan.'], 404);
        }

        foreach ($targets as $target) {
            if ($target->is_locked || ! ($target->periode?->is_active ?? true)) {
                return response()->json([
                    'message' => 'Pengajaran telah dikunci atau berada pada periode arsip sehingga tidak dapat diubah.',
                ], 422);
            }
        }

        DB::transaction(function () use ($targets, $normalized): void {
            foreach ($targets as $pengajaran) {
                $existing = $pengajaran->komponenNilai()->get();
                $keptIds = [];

                foreach ($normalized as $item) {
                    $matched = null;
                    if ($item['id'] !== null) {
                        $matched = $existing->firstWhere('id', $item['id']);
                    }
                    $matched ??= $existing->first(
                        fn (KomponenNilai $k) => strtolower($k->nama_komponen) === strtolower($item['nama_komponen'])
                            && ! in_array($k->id, $keptIds, true)
                    );

                    if ($matched) {
                        $matched->update([
                            'nama_komponen' => $item['nama_komponen'],
                            'bobot_persen' => $item['bobot_persen'],
                            'urutan' => $item['urutan'],
                        ]);
                        $keptIds[] = $matched->id;
                    } else {
                        $created = KomponenNilai::create([
                            'pengajaran_id' => $pengajaran->id,
                            'nama_komponen' => $item['nama_komponen'],
                            'bobot_persen' => $item['bobot_persen'],
                            'urutan' => $item['urutan'],
                        ]);
                        $keptIds[] = $created->id;
                    }
                }

                KomponenNilai::where('pengajaran_id', $pengajaran->id)
                    ->whereNotIn('id', $keptIds)
                    ->delete();

                $pengajaran->unsetRelation('komponenNilai');
                $this->gradeService->recalculateForPengajaran($pengajaran);
            }
        });

        $refreshedList = $this->resolveTeacherPengajaranList($request);

        return response()->json([
            'message' => 'Komponen penilaian berhasil disimpan.',
            'data' => $this->buildTeacherWorkspacePayload($refreshedList),
        ]);
    }

    public function getNilai(Request $request, int $id): JsonResponse
    {
        $pengajaran = $this->findAuthorizedPengajaran($request, $id);
        $payload = $this->buildTeacherWorkspacePayload(new Collection([$pengajaran]));

        return response()->json([
            'data' => [
                'assignment' => $payload['assignments'][0] ?? null,
                'components' => $payload['componentsByAssignment'][(string) $pengajaran->id] ?? [],
                'scores' => $payload['scores'],
                'finalGrades' => $pengajaran->nilaiAkhirMapel()->get(),
            ],
        ]);
    }

    public function updateNilai(Request $request, int $id): JsonResponse
    {
        $pengajaran = $this->findAuthorizedPengajaran($request, $id);
        if ($pengajaran->is_locked || ! ($pengajaran->periode?->is_active ?? true)) {
            return response()->json([
                'message' => 'Nilai pengajaran ini telah dikunci atau berada pada periode arsip.',
            ], 422);
        }

        $pengajaran->load(['komponenNilai', 'kelas.anggotaKelas.siswa']);
        $komponenMap = $pengajaran->komponenNilai->keyBy(fn (KomponenNilai $k) => (string) $k->id);
        $anggotaBySiswaId = $pengajaran->kelas?->anggotaKelas->keyBy(fn (AnggotaKelas $ak) => (string) $ak->siswa_id) ?? collect();
        $anggotaById = $pengajaran->kelas?->anggotaKelas->keyBy(fn (AnggotaKelas $ak) => (string) $ak->id) ?? collect();

        $scoresInput = $request->input('scores');
        if (! is_array($scoresInput)) {
            return response()->json(['message' => 'Format data nilai tidak valid.'], 422);
        }

        $upserts = [];
        $deletes = [];

        foreach ($scoresInput as $studentKey => $componentScores) {
            if (! is_array($componentScores)) {
                continue;
            }

            /** @var AnggotaKelas|null $anggota */
            $anggota = $anggotaBySiswaId->get((string) $studentKey) ?? $anggotaById->get((string) $studentKey);
            if (! $anggota) {
                continue;
            }

            foreach ($componentScores as $compKey => $rawScore) {
                /** @var KomponenNilai|null $komponen */
                $komponen = $komponenMap->get((string) $compKey);
                if (! $komponen) {
                    continue;
                }

                $trimmed = is_string($rawScore) ? trim(str_replace(',', '.', $rawScore)) : $rawScore;
                if ($trimmed === '' || $trimmed === null) {
                    $deletes[] = [
                        'komponen_id' => $komponen->id,
                        'anggota_kelas_id' => $anggota->id,
                    ];

                    continue;
                }

                if (! is_numeric($trimmed) || (float) $trimmed < 0 || (float) $trimmed > 100) {
                    return response()->json([
                        'message' => "Nilai untuk komponen {$komponen->nama_komponen} harus berada pada rentang 0–100.",
                    ], 422);
                }

                $upserts[] = [
                    'komponen_id' => $komponen->id,
                    'anggota_kelas_id' => $anggota->id,
                    'nilai_angka' => round((float) $trimmed, 2),
                ];
            }
        }

        $userId = $request->user()?->id;

        DB::transaction(function () use ($upserts, $deletes, $userId, $pengajaran): void {
            foreach ($deletes as $del) {
                NilaiDetail::where('komponen_id', $del['komponen_id'])
                    ->where('anggota_kelas_id', $del['anggota_kelas_id'])
                    ->delete();
            }

            foreach ($upserts as $item) {
                NilaiDetail::updateOrCreate(
                    [
                        'komponen_id' => $item['komponen_id'],
                        'anggota_kelas_id' => $item['anggota_kelas_id'],
                    ],
                    [
                        'nilai_angka' => $item['nilai_angka'],
                        'updated_by' => $userId,
                    ]
                );
            }

            $this->gradeService->recalculateForPengajaran($pengajaran);
        });

        $refreshedList = $this->resolveTeacherPengajaranList($request);

        return response()->json([
            'message' => 'Nilai siswa berhasil disimpan dan nilai akhir telah diperbarui.',
            'data' => $this->buildTeacherWorkspacePayload($refreshedList),
        ]);
    }

    public function importNilai(Request $request, int $id): JsonResponse
    {
        return $this->updateNilai($request, $id);
    }

    public function statistik(Request $request, int $id): JsonResponse
    {
        $pengajaran = $this->findAuthorizedPengajaran($request, $id);

        return response()->json([
            'data' => $this->gradeService->calculateStatistics($pengajaran),
        ]);
    }

    private function resolveSelectedPeriode(Request $request): ?PeriodeAkademik
    {
        if ($request->filled('periode_id')) {
            return PeriodeAkademik::find($request->input('periode_id'));
        }
        if ($request->filled('period')) {
            return PeriodeAkademik::where('nama_periode', trim((string) $request->input('period')))->first();
        }

        return PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();
    }

    /**
     * @return Collection<int, Pengajaran>
     */
    private function resolveTeacherPengajaranList(Request $request, ?PeriodeAkademik $periode = null): Collection
    {
        $user = $request->user();
        $periodeTarget = $periode ?? $this->resolveSelectedPeriode($request);

        $query = Pengajaran::with([
            'periode',
            'mataPelajaran',
            'guru',
            'kelas.anggotaKelas.siswa',
            'komponenNilai',
            'nilaiAkhirMapel',
        ])->orderBy('id');

        if ($periodeTarget) {
            $query->where('periode_id', $periodeTarget->id);
        }

        if ($user && in_array(strtolower((string) $user->role), ['teacher', 'guru', 'role_guru'], true)) {
            $guru = Guru::where('user_id', $user->id)->first();
            if (! $guru) {
                return new Collection();
            }
            $query->where('guru_id', $guru->id);
        }

        return $query->get();
    }

    private function findAuthorizedPengajaran(Request $request, int $id): Pengajaran
    {
        $pengajaran = Pengajaran::with([
            'periode',
            'mataPelajaran',
            'guru',
            'kelas.anggotaKelas.siswa',
            'komponenNilai',
            'nilaiAkhirMapel',
        ])->findOrFail($id);

        $user = $request->user();
        if ($user && in_array(strtolower((string) $user->role), ['teacher', 'guru', 'role_guru'], true)) {
            $guru = Guru::where('user_id', $user->id)->first();
            if (! $guru || $pengajaran->guru_id !== $guru->id) {
                abort(response()->json([
                    'message' => 'Anda tidak memiliki akses pada pengajaran kelas ini.',
                ], 403));
            }
        }

        return $pengajaran;
    }

    /**
     * @param  Collection<int, Pengajaran>  $pengajaranList
     * @return array<string, mixed>
     */
    private function buildTeacherWorkspacePayload(Collection $pengajaranList, ?PeriodeAkademik $selectedPeriode = null): array
    {
        $assignments = [];
        $componentsByAssignment = [];
        $scores = [];

        $allKomponenIds = $pengajaranList->flatMap(fn (Pengajaran $p) => $p->komponenNilai->pluck('id'))->all();
        $allAnggotaIds = $pengajaranList->flatMap(
            fn (Pengajaran $p) => $p->kelas?->anggotaKelas->pluck('id') ?? collect()
        )->unique()->all();

        $nilaiDetails = NilaiDetail::whereIn('komponen_id', $allKomponenIds)
            ->whereIn('anggota_kelas_id', $allAnggotaIds)
            ->get();

        $anggotaToSiswaId = [];
        foreach ($pengajaranList as $pengajaran) {
            $assignmentId = (string) $pengajaran->id;
            $students = [];

            foreach ($pengajaran->kelas?->anggotaKelas ?? [] as $anggota) {
                $siswa = $anggota->siswa;
                if (! $siswa) {
                    continue;
                }
                $studentId = (string) $siswa->id;
                $anggotaToSiswaId[$anggota->id] = $studentId;

                $students[] = [
                    'id' => $studentId,
                    'anggota_kelas_id' => (string) $anggota->id,
                    'nis' => $siswa->nis,
                    'name' => $siswa->nama_lengkap,
                    'gender' => $siswa->jenis_kelamin,
                ];
            }

            usort($students, fn (array $a, array $b) => strcmp($a['nis'], $b['nis']));

            $isPeriodActive = (bool) ($pengajaran->periode?->is_active ?? true);

            $assignments[] = [
                'id' => $assignmentId,
                'subject' => $pengajaran->mataPelajaran?->nama_mapel ?? '',
                'className' => $pengajaran->kelas?->nama_kelas ?? '',
                'period' => $pengajaran->periode?->nama_periode ?? '',
                'kkm' => (float) $pengajaran->kkm,
                'isLocked' => (bool) $pengajaran->is_locked || ! $isPeriodActive,
                'students' => $students,
            ];

            $componentsByAssignment[$assignmentId] = $pengajaran->komponenNilai
                ->sortBy('urutan')
                ->values()
                ->map(fn (KomponenNilai $k) => $this->formatKomponen($k))
                ->all();
        }

        foreach ($nilaiDetails as $detail) {
            $studentId = $anggotaToSiswaId[$detail->anggota_kelas_id] ?? null;
            if ($studentId === null || $detail->nilai_angka === null) {
                continue;
            }
            $compId = (string) $detail->komponen_id;
            $formattedVal = rtrim(rtrim(number_format((float) $detail->nilai_angka, 2, '.', ''), '0'), '.');
            $scores[$studentId][$compId] = $formattedVal;
        }

        $firstPeriodeId = $selectedPeriode?->id ?? $pengajaranList->first()?->periode_id;
        $rentangList = $this->gradeService->getRentangNilaiForPeriode($firstPeriodeId);
        $grades = array_map(fn (array $r) => [
            'letter' => $r['predikat'],
            'lower' => $r['batas_bawah'],
            'upper' => $r['batas_atas'],
            'description' => $r['keterangan'],
        ], $rentangList);

        $allPeriods = PeriodeAkademik::orderByDesc('is_active')
            ->orderByDesc('tanggal_mulai')
            ->get()
            ->map(fn (PeriodeAkademik $p) => [
                'id' => (string) $p->id,
                'name' => $p->nama_periode,
                'isActive' => (bool) $p->is_active,
            ])
            ->values()
            ->all();

        return [
            'assignments' => $assignments,
            'componentsByAssignment' => $componentsByAssignment,
            'scores' => (object) $scores,
            'grades' => $grades,
            'periods' => $allPeriods,
            'selectedPeriod' => $selectedPeriode?->nama_periode ?? ($pengajaranList->first()?->periode?->nama_periode ?? ''),
        ];
    }

    /**
     * @return array{id: string, name: string, weight: string, nama_komponen: string, bobot_persen: float, urutan: int}
     */
    private function formatKomponen(KomponenNilai $k): array
    {
        $weight = rtrim(rtrim(number_format((float) $k->bobot_persen, 2, '.', ''), '0'), '.');

        return [
            'id' => (string) $k->id,
            'name' => $k->nama_komponen,
            'nama_komponen' => $k->nama_komponen,
            'weight' => $weight,
            'bobot_persen' => (float) $k->bobot_persen,
            'urutan' => (int) $k->urutan,
        ];
    }
}

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
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengajaranController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Pengajaran::with(['guru', 'mataPelajaran', 'kelas', 'periode'])
            ->orderBy('id');

        if ($request->filled('periode_id')) {
            $query->where('periode_id', (int) $request->input('periode_id'));
        }

        $items = $query->get()->map(fn (Pengajaran $p) => $this->formatPengajaran($p));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validatePengajaran($request);

        $pengajaran = DB::transaction(function () use ($payload): Pengajaran {
            $created = Pengajaran::create($payload);

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

            return $created;
        });

        $pengajaran->load(['guru', 'mataPelajaran', 'kelas', 'periode']);

        return response()->json([
            'message' => 'Penugasan pengajaran berhasil ditambahkan.',
            'data' => $this->formatPengajaran($pengajaran),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $pengajaran = Pengajaran::findOrFail($id);
        $payload = $this->validatePengajaran($request, $pengajaran->id);
        $pengajaran->update($payload);
        $pengajaran->load(['guru', 'mataPelajaran', 'kelas', 'periode']);

        return response()->json([
            'message' => 'Penugasan pengajaran berhasil diperbarui.',
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

        $academic = PeriodeAkademik::orderByDesc('is_active')
            ->orderByDesc('tanggal_mulai')
            ->get()
            ->map(fn (PeriodeAkademik $p) => $periodeController->formatPeriode($p))
            ->values();

        $gradesQuery = RentangNilai::orderByDesc('batas_bawah');
        if ($periodeAktif) {
            $gradesQuery->where('periode_id', $periodeAktif->id);
        }
        $grades = $gradesQuery->get()
            ->map(fn (RentangNilai $r) => $rentangController->formatRentang($r))
            ->values();

        $subjects = MataPelajaran::orderBy('kode_mapel')
            ->get()
            ->map(fn (MataPelajaran $m) => $mapelController->formatMapel($m))
            ->values();

        $classes = Kelas::with(['periode', 'waliKelas'])
            ->withCount('anggotaKelas')
            ->orderBy('kode_kelas')
            ->get()
            ->map(fn (Kelas $k) => $kelasController->formatKelas($k))
            ->values();

        $teachers = Guru::with('user')
            ->orderBy('nama_lengkap')
            ->get()
            ->map(fn (Guru $g) => $guruController->formatGuru($g))
            ->values();

        $students = Siswa::with(['anggotaKelas.kelas'])
            ->orderBy('nis')
            ->get()
            ->map(fn (Siswa $s) => $siswaController->formatSiswa($s, $periodeAktif?->id))
            ->values();

        $assignments = Pengajaran::with(['guru', 'mataPelajaran', 'kelas', 'periode'])
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

        return [
            'id' => (string) $p->id,
            'periode_id' => (string) $p->periode_id,
            'kelas_id' => (string) $p->kelas_id,
            'mapel_id' => (string) $p->mapel_id,
            'guru_id' => (string) $p->guru_id,
            'teacher' => $p->guru?->nama_lengkap ?? '',
            'subject' => $p->mataPelajaran?->nama_mapel ?? '',
            'className' => $p->kelas?->nama_kelas ?? '',
            'period' => $p->periode?->nama_periode ?? '',
            'kkm' => $kkm,
            'is_locked' => (bool) $p->is_locked,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validatePengajaran(Request $request, ?int $ignoreId = null): array
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

        $guru = null;
        if ($request->filled('guru_id')) {
            $guru = Guru::find($request->input('guru_id'));
        } elseif ($request->filled('teacher')) {
            $guru = Guru::where('nama_lengkap', trim((string) $request->input('teacher')))->first();
        }
        if (! $guru) {
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

        $duplicateQuery = Pengajaran::where('periode_id', $periode->id)
            ->where('kelas_id', $kelas->id)
            ->where('mapel_id', $mapel->id);
        if ($ignoreId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreId);
        }
        if ($duplicateQuery->exists()) {
            abort(response()->json([
                'message' => 'Penugasan mata pelajaran pada kelas dan periode tersebut sudah ada.',
            ], 422));
        }

        return [
            'periode_id' => $periode->id,
            'kelas_id' => $kelas->id,
            'mapel_id' => $mapel->id,
            'guru_id' => $guru->id,
            'kkm' => round((float) $kkmRaw, 2),
            'is_locked' => (bool) $request->boolean('is_locked', false),
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\AnggotaKelas;
use App\Models\Guru;
use App\Models\Kelas;
use App\Models\PeriodeAkademik;
use App\Models\Siswa;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SiswaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $user = $request->user();

        $query = Siswa::with(['anggotaKelas.kelas'])->orderBy('nis');

        if ($user && in_array(strtolower((string) $user->role), ['teacher', 'guru', 'role_guru'], true)) {
            $guru = Guru::where('user_id', $user->id)->first();
            if ($guru) {
                $allowedKelasIds = Kelas::where('wali_kelas_id', $guru->id)
                    ->orWhereHas('pengajaran', fn ($q) => $q->where('guru_id', $guru->id))
                    ->pluck('id')
                    ->all();

                $query->whereHas('anggotaKelas', fn ($q) => $q->whereIn('kelas_id', $allowedKelasIds));
            }
        }

        if ($request->filled('search')) {
            $search = strtolower(trim((string) $request->input('search')));
            $query->where(function ($q) use ($search) {
                $q->whereRaw('LOWER(nama_lengkap) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(nis) LIKE ?', ["%{$search}%"])
                    ->orWhereRaw('LOWER(COALESCE(nisn, \'\')) LIKE ?', ["%{$search}%"]);
            });
        }

        $items = $query->get()->map(fn (Siswa $s) => $this->formatSiswa($s, $periodeAktif?->id));

        if ($request->filled('className') && $request->input('className') !== 'Semua Kelas') {
            $classFilter = (string) $request->input('className');
            $items = $items->filter(fn (array $item) => $item['className'] === $classFilter)->values();
        }

        if ($request->filled('status') && $request->input('status') !== 'Semua Status') {
            $statusFilter = strtolower((string) $request->input('status'));
            $items = $items->filter(fn (array $item) => strtolower($item['status']) === $statusFilter)->values();
        }

        return response()->json(['data' => $items]);
    }

    public function show(int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $siswa = Siswa::with(['anggotaKelas.kelas'])->findOrFail($id);

        return response()->json(['data' => $this->formatSiswa($siswa, $periodeAktif?->id)]);
    }

    public function store(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        if (! $periodeAktif) {
            return response()->json(['message' => 'Periode akademik aktif belum tersedia.'], 422);
        }

        $payload = $this->validateSiswa($request, $periodeAktif->id);

        $siswa = DB::transaction(function () use ($payload): Siswa {
            $created = Siswa::create([
                'nis' => $payload['nis'],
                'nisn' => $payload['nisn'],
                'nama_lengkap' => $payload['nama_lengkap'],
                'jenis_kelamin' => $payload['jenis_kelamin'],
                'status' => $payload['status'],
            ]);

            AnggotaKelas::updateOrCreate([
                'kelas_id' => $payload['kelas']->id,
                'siswa_id' => $created->id,
            ]);

            return $created;
        });

        $siswa->load('anggotaKelas.kelas');

        return response()->json([
            'message' => 'Data siswa berhasil ditambahkan.',
            'data' => $this->formatSiswa($siswa, $periodeAktif->id),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        if (! $periodeAktif) {
            return response()->json(['message' => 'Periode akademik aktif belum tersedia.'], 422);
        }

        $siswa = Siswa::findOrFail($id);
        $payload = $this->validateSiswa($request, $periodeAktif->id, $siswa->id);

        DB::transaction(function () use ($siswa, $payload, $periodeAktif): void {
            $siswa->update([
                'nis' => $payload['nis'],
                'nisn' => $payload['nisn'],
                'nama_lengkap' => $payload['nama_lengkap'],
                'jenis_kelamin' => $payload['jenis_kelamin'],
                'status' => $payload['status'],
            ]);

            $activeKelasIds = Kelas::where('periode_id', $periodeAktif->id)->pluck('id')->all();
            AnggotaKelas::where('siswa_id', $siswa->id)
                ->whereIn('kelas_id', $activeKelasIds)
                ->where('kelas_id', '!=', $payload['kelas']->id)
                ->delete();

            AnggotaKelas::updateOrCreate([
                'kelas_id' => $payload['kelas']->id,
                'siswa_id' => $siswa->id,
            ]);
        });

        $siswa->load('anggotaKelas.kelas');

        return response()->json([
            'message' => 'Data siswa berhasil diperbarui.',
            'data' => $this->formatSiswa($siswa, $periodeAktif->id),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $siswa = Siswa::findOrFail($id);
        $siswa->delete();

        return response()->json(['message' => 'Data siswa berhasil dihapus.']);
    }

    public function import(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        if (! $periodeAktif) {
            return response()->json(['message' => 'Periode akademik aktif belum tersedia.'], 422);
        }

        $rows = $request->input('students');
        if (! is_array($rows) || $rows === []) {
            return response()->json(['message' => 'Data siswa untuk diimpor tidak ditemukan.'], 422);
        }

        $kelasMap = Kelas::where('periode_id', $periodeAktif->id)
            ->get()
            ->keyBy(fn (Kelas $k) => strtoupper($k->kode_kelas));

        $existingNis = Siswa::pluck('nis')->flip()->all();
        $existingNisn = Siswa::whereNotNull('nisn')->pluck('nisn')->flip()->all();

        $seenNis = [];
        $seenNisn = [];
        $errors = [];
        $validatedRows = [];

        foreach ($rows as $index => $row) {
            $rowNumber = (int) ($row['row_number'] ?? ($index + 2));
            $nis = trim((string) ($row['nis'] ?? ''));
            $nisn = trim((string) ($row['nisn'] ?? ''));
            $nama = trim((string) ($row['nama_lengkap'] ?? $row['name'] ?? ''));
            $gender = strtoupper(trim((string) ($row['jenis_kelamin'] ?? $row['gender'] ?? '')));
            $kodeKelas = strtoupper(trim((string) ($row['kode_kelas'] ?? $row['className'] ?? '')));

            if ($nis === '' || $nisn === '' || $nama === '' || $gender === '' || $kodeKelas === '') {
                $errors[] = "Baris {$rowNumber}: kolom wajib belum lengkap.";

                continue;
            }

            if (! in_array($gender, ['L', 'P'], true)) {
                $errors[] = "Baris {$rowNumber}: jenis kelamin harus L atau P.";

                continue;
            }

            if (isset($existingNis[$nis]) || isset($seenNis[$nis])) {
                $errors[] = "Baris {$rowNumber}: NIS {$nis} sudah terdaftar atau duplikat.";

                continue;
            }

            if (isset($existingNisn[$nisn]) || isset($seenNisn[$nisn])) {
                $errors[] = "Baris {$rowNumber}: NISN {$nisn} sudah terdaftar atau duplikat.";

                continue;
            }

            $kelas = $kelasMap->get($kodeKelas);
            if (! $kelas) {
                $errors[] = "Baris {$rowNumber}: kode kelas {$kodeKelas} tidak terdaftar pada periode aktif.";

                continue;
            }

            $seenNis[$nis] = true;
            $seenNisn[$nisn] = true;
            $validatedRows[] = [
                'nis' => $nis,
                'nisn' => $nisn,
                'nama_lengkap' => $nama,
                'jenis_kelamin' => $gender,
                'kelas_id' => $kelas->id,
            ];
        }

        if ($errors !== []) {
            return response()->json([
                'message' => 'Impor dibatalkan; tidak ada data yang disimpan. '.implode(' ', array_slice($errors, 0, 3)),
                'errors' => $errors,
            ], 422);
        }

        $createdStudents = DB::transaction(function () use ($validatedRows): array {
            $result = [];
            foreach ($validatedRows as $item) {
                $siswa = Siswa::create([
                    'nis' => $item['nis'],
                    'nisn' => $item['nisn'],
                    'nama_lengkap' => $item['nama_lengkap'],
                    'jenis_kelamin' => $item['jenis_kelamin'],
                    'status' => 'AKTIF',
                ]);

                AnggotaKelas::create([
                    'kelas_id' => $item['kelas_id'],
                    'siswa_id' => $siswa->id,
                ]);

                $result[] = $siswa;
            }

            return $result;
        });

        $formatted = collect($createdStudents)->map(function (Siswa $s) use ($periodeAktif) {
            $s->load('anggotaKelas.kelas');

            return $this->formatSiswa($s, $periodeAktif->id);
        });

        return response()->json([
            'message' => count($createdStudents).' siswa berhasil diimpor.',
            'data' => $formatted,
        ], 201);
    }

    public function export(Request $request): JsonResponse
    {
        return $this->index($request);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatSiswa(Siswa $s, ?int $periodeId = null): array
    {
        $anggota = $s->anggotaKelas
            ->first(fn (AnggotaKelas $ak) => $periodeId === null || $ak->kelas?->periode_id === $periodeId)
            ?? $s->anggotaKelas->first();

        $statusLabel = match (strtoupper((string) $s->status)) {
            'LULUS' => 'Lulus',
            'PINDAH' => 'Pindah',
            'NONAKTIF' => 'Nonaktif',
            default => 'Aktif',
        };

        return [
            'id' => (string) $s->id,
            'nis' => $s->nis,
            'nisn' => (string) ($s->nisn ?? ''),
            'name' => $s->nama_lengkap,
            'nama_lengkap' => $s->nama_lengkap,
            'gender' => $s->jenis_kelamin,
            'jenis_kelamin' => $s->jenis_kelamin,
            'className' => $anggota?->kelas?->kode_kelas ?? '',
            'kode_kelas' => $anggota?->kelas?->kode_kelas ?? '',
            'kelas_id' => $anggota?->kelas_id ? (string) $anggota->kelas_id : null,
            'status' => $statusLabel,
        ];
    }

    private function getActivePeriode(): ?PeriodeAkademik
    {
        return PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateSiswa(Request $request, int $periodeId, ?int $ignoreId = null): array
    {
        $nis = trim((string) ($request->input('nis') ?? ''));
        $nisn = trim((string) ($request->input('nisn') ?? ''));
        $nama = trim((string) ($request->input('nama_lengkap') ?? $request->input('name') ?? ''));
        $gender = strtoupper(trim((string) ($request->input('jenis_kelamin') ?? $request->input('gender') ?? 'L')));
        $kodeKelas = trim((string) ($request->input('kode_kelas') ?? $request->input('className') ?? ''));
        $statusRaw = strtoupper(trim((string) ($request->input('status') ?? 'AKTIF')));

        if ($nis === '' || $nama === '') {
            abort(response()->json(['message' => 'NIS dan nama lengkap wajib diisi.'], 422));
        }

        if (! in_array($gender, ['L', 'P'], true)) {
            abort(response()->json(['message' => 'Jenis kelamin harus L atau P.'], 422));
        }

        $duplicateQuery = Siswa::where(function ($q) use ($nis, $nisn) {
            $q->where('nis', $nis);
            if ($nisn !== '') {
                $q->orWhere('nisn', $nisn);
            }
        });
        if ($ignoreId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreId);
        }
        if ($duplicateQuery->exists()) {
            abort(response()->json(['message' => 'NIS atau NISN sudah terdaftar.'], 422));
        }

        $kelas = null;
        if ($request->filled('kelas_id')) {
            $kelas = Kelas::where('periode_id', $periodeId)->find($request->input('kelas_id'));
        } elseif ($kodeKelas !== '') {
            $kelas = Kelas::where('periode_id', $periodeId)
                ->whereRaw('LOWER(kode_kelas) = ?', [strtolower($kodeKelas)])
                ->first();
        }

        if (! $kelas) {
            abort(response()->json(['message' => 'Pilih kelas yang terdaftar pada periode aktif.'], 422));
        }

        $status = in_array($statusRaw, ['AKTIF', 'LULUS', 'PINDAH', 'NONAKTIF'], true)
            ? $statusRaw
            : 'AKTIF';

        return [
            'nis' => $nis,
            'nisn' => $nisn !== '' ? $nisn : null,
            'nama_lengkap' => $nama,
            'jenis_kelamin' => $gender,
            'status' => $status,
            'kelas' => $kelas,
        ];
    }
}

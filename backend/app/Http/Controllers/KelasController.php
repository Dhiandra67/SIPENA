<?php

namespace App\Http\Controllers;

use App\Models\Guru;
use App\Models\Kelas;
use App\Models\PeriodeAkademik;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KelasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = Kelas::with(['periode', 'waliKelas'])
            ->withCount('anggotaKelas')
            ->orderBy('kode_kelas');

        if ($user && in_array(strtolower((string) $user->role), ['teacher', 'guru', 'role_guru'], true)) {
            $guru = Guru::where('user_id', $user->id)->first();
            if (! $guru) {
                return response()->json(['data' => []]);
            }

            $query->where(function ($q) use ($guru) {
                $q->where('wali_kelas_id', $guru->id)
                    ->orWhereHas('pengajaran', fn ($pq) => $pq->where('guru_id', $guru->id));
            });
        }

        $items = $query->get()->map(fn (Kelas $k) => $this->formatKelas($k));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validateKelas($request);
        $kelas = Kelas::create($payload);
        $kelas->load(['periode', 'waliKelas'])->loadCount('anggotaKelas');

        return response()->json([
            'message' => 'Data kelas berhasil ditambahkan.',
            'data' => $this->formatKelas($kelas),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $kelas = Kelas::findOrFail($id);
        $payload = $this->validateKelas($request, $kelas->id);
        $kelas->update($payload);
        $kelas->load(['periode', 'waliKelas'])->loadCount('anggotaKelas');

        return response()->json([
            'message' => 'Data kelas berhasil diperbarui.',
            'data' => $this->formatKelas($kelas),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $kelas = Kelas::withCount(['anggotaKelas', 'pengajaran'])->findOrFail($id);

        if ($kelas->anggota_kelas_count > 0 || $kelas->pengajaran_count > 0) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        $kelas->delete();

        return response()->json(['message' => 'Data kelas berhasil dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatKelas(Kelas $k): array
    {
        return [
            'id' => (string) $k->id,
            'code' => $k->kode_kelas,
            'kode_kelas' => $k->kode_kelas,
            'name' => $k->nama_kelas,
            'nama_kelas' => $k->nama_kelas,
            'level' => $k->tingkat,
            'tingkat' => $k->tingkat,
            'homeroom' => $k->waliKelas?->nama_lengkap ?? '',
            'wali_kelas_id' => $k->wali_kelas_id ? (string) $k->wali_kelas_id : null,
            'period' => $k->periode?->nama_periode ?? '',
            'periode_id' => (string) $k->periode_id,
            'students' => (string) ($k->anggota_kelas_count ?? $k->anggotaKelas()->count()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validateKelas(Request $request, ?int $ignoreId = null): array
    {
        $kode = trim((string) ($request->input('kode_kelas') ?? $request->input('code') ?? ''));
        $nama = trim((string) ($request->input('nama_kelas') ?? $request->input('name') ?? $kode));
        $tingkat = trim((string) ($request->input('tingkat') ?? $request->input('level') ?? 'VII'));

        if ($kode === '' || $nama === '') {
            abort(response()->json(['message' => 'Kode kelas dan nama kelas wajib diisi.'], 422));
        }

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

        $duplicateQuery = Kelas::where('periode_id', $periode->id)
            ->whereRaw('LOWER(kode_kelas) = ?', [strtolower($kode)]);
        if ($ignoreId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreId);
        }
        if ($duplicateQuery->exists()) {
            abort(response()->json(['message' => 'Kode kelas sudah terdaftar pada periode tersebut.'], 422));
        }

        $waliKelasId = null;
        if ($request->filled('wali_kelas_id')) {
            $waliKelasId = (int) $request->input('wali_kelas_id');
        } elseif ($request->filled('homeroom')) {
            $guru = Guru::where('nama_lengkap', trim((string) $request->input('homeroom')))->first();
            $waliKelasId = $guru?->id;
        }

        return [
            'periode_id' => $periode->id,
            'wali_kelas_id' => $waliKelasId,
            'kode_kelas' => $kode,
            'nama_kelas' => $nama,
            'tingkat' => $tingkat,
        ];
    }
}

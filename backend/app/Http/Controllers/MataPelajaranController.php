<?php

namespace App\Http\Controllers;

use App\Models\MataPelajaran;
use App\Models\PeriodeAkademik;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MataPelajaranController extends Controller
{
    public function index(): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $query = MataPelajaran::orderBy('kode_mapel');

        if ($periodeAktif) {
            $query->whereHas('periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeAktif->id));
        }

        $items = $query->get()->map(fn (MataPelajaran $m) => $this->formatMapel($m, $periodeAktif?->nama_periode));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $payload = $this->validateMapel($request, null, $periodeAktif?->id);

        $existing = MataPelajaran::whereRaw('LOWER(kode_mapel) = ?', [strtolower($payload['kode_mapel'])])
            ->orWhereRaw('LOWER(nama_mapel) = ?', [strtolower($payload['nama_mapel'])])
            ->first();

        if ($existing) {
            $existing->update($payload);
            $mapel = $existing;
        } else {
            $mapel = MataPelajaran::create($payload);
        }

        if ($periodeAktif) {
            $mapel->periodeAkademik()->syncWithoutDetaching([$periodeAktif->id]);
        }

        return response()->json([
            'message' => 'Mata pelajaran berhasil ditambahkan.',
            'data' => $this->formatMapel($mapel, $periodeAktif?->nama_periode),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $mapel = MataPelajaran::findOrFail($id);
        $payload = $this->validateMapel($request, $mapel->id, $periodeAktif?->id);
        $mapel->update($payload);

        return response()->json([
            'message' => 'Mata pelajaran berhasil diperbarui.',
            'data' => $this->formatMapel($mapel->fresh(), $periodeAktif?->nama_periode),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $periodeAktif = $this->getActivePeriode();
        $mapel = MataPelajaran::withCount('pengajaran')->findOrFail($id);

        $inUseInActivePeriod = $periodeAktif
            ? $mapel->pengajaran()->where('periode_id', $periodeAktif->id)->exists()
            : ($mapel->pengajaran_count > 0);

        if ($inUseInActivePeriod) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        if ($periodeAktif) {
            $mapel->periodeAkademik()->detach($periodeAktif->id);
        }

        if (! $mapel->periodeAkademik()->exists() && ! $mapel->pengajaran()->exists()) {
            $mapel->delete();
        }

        return response()->json(['message' => 'Mata pelajaran berhasil dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatMapel(MataPelajaran $m, ?string $periodName = null): array
    {
        $kkm = rtrim(rtrim(number_format((float) $m->kkm_default, 2, '.', ''), '0'), '.');

        return [
            'id' => (string) $m->id,
            'code' => $m->kode_mapel,
            'kode_mapel' => $m->kode_mapel,
            'name' => $m->nama_mapel,
            'nama_mapel' => $m->nama_mapel,
            'group' => $m->kelompok,
            'kelompok' => $m->kelompok,
            'kkm' => $kkm,
            'kkm_default' => (float) $m->kkm_default,
            'period' => $periodName ?? ($this->getActivePeriode()?->nama_periode ?? ''),
            'is_active' => (bool) $m->is_active,
            'status' => $m->is_active ? 'Aktif' : 'Tidak aktif',
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
    private function validateMapel(Request $request, ?int $ignoreId = null, ?int $periodeId = null): array
    {
        $kode = strtoupper(trim((string) ($request->input('kode_mapel') ?? $request->input('code') ?? '')));
        $nama = trim((string) ($request->input('nama_mapel') ?? $request->input('name') ?? ''));
        $kelompok = trim((string) ($request->input('kelompok') ?? $request->input('group') ?? 'Umum'));
        $kkmRaw = $request->input('kkm_default') ?? $request->input('kkm') ?? 75;

        if ($kode === '' || $nama === '' || ! is_numeric($kkmRaw)) {
            abort(response()->json(['message' => 'Kode, nama mata pelajaran, dan KKM wajib diisi.'], 422));
        }

        $kkm = (float) $kkmRaw;
        if ($kkm < 0 || $kkm > 100) {
            abort(response()->json(['message' => 'KKM harus berada pada rentang 0–100.'], 422));
        }

        $duplicateQuery = MataPelajaran::where(function ($q) use ($kode, $nama) {
            $q->whereRaw('LOWER(kode_mapel) = ?', [strtolower($kode)])
                ->orWhereRaw('LOWER(nama_mapel) = ?', [strtolower($nama)]);
        });
        if ($ignoreId !== null) {
            $duplicateQuery->where('id', '!=', $ignoreId);
        } elseif ($periodeId !== null) {
            $duplicateQuery->whereHas('periodeAkademik', fn ($q) => $q->where('periode_akademik.id', $periodeId));
        }
        if ($duplicateQuery->exists()) {
            abort(response()->json(['message' => 'Kode atau nama mata pelajaran sudah terdaftar.'], 422));
        }

        $statusInput = $request->input('status');
        $isActive = $request->has('is_active')
            ? (bool) $request->boolean('is_active')
            : (! is_string($statusInput) || strtolower(trim($statusInput)) !== 'tidak aktif');

        return [
            'kode_mapel' => $kode,
            'nama_mapel' => $nama,
            'kelompok' => $kelompok !== '' ? $kelompok : 'Umum',
            'kkm_default' => round($kkm, 2),
            'is_active' => $isActive,
        ];
    }
}

<?php

namespace App\Http\Controllers;

use App\Models\MataPelajaran;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MataPelajaranController extends Controller
{
    public function index(): JsonResponse
    {
        $items = MataPelajaran::orderBy('kode_mapel')
            ->get()
            ->map(fn (MataPelajaran $m) => $this->formatMapel($m));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $payload = $this->validateMapel($request);
        $mapel = MataPelajaran::create($payload);

        return response()->json([
            'message' => 'Mata pelajaran berhasil ditambahkan.',
            'data' => $this->formatMapel($mapel),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $mapel = MataPelajaran::findOrFail($id);
        $payload = $this->validateMapel($request, $mapel->id);
        $mapel->update($payload);

        return response()->json([
            'message' => 'Mata pelajaran berhasil diperbarui.',
            'data' => $this->formatMapel($mapel->fresh()),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $mapel = MataPelajaran::withCount('pengajaran')->findOrFail($id);

        if ($mapel->pengajaran_count > 0) {
            return response()->json([
                'message' => 'Data masih digunakan oleh data akademik lain. Hapus atau pindahkan relasinya terlebih dahulu.',
            ], 422);
        }

        $mapel->delete();

        return response()->json(['message' => 'Mata pelajaran berhasil dihapus.']);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatMapel(MataPelajaran $m): array
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
            'is_active' => (bool) $m->is_active,
            'status' => $m->is_active ? 'Aktif' : 'Tidak aktif',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function validateMapel(Request $request, ?int $ignoreId = null): array
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

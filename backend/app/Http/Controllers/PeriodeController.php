<?php

namespace App\Http\Controllers;

use App\Models\PeriodeAkademik;
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

            return PeriodeAkademik::create($payload);
        });

        return response()->json([
            'message' => 'Periode akademik berhasil ditambahkan.',
            'data' => $this->formatPeriode($periode),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $periode = PeriodeAkademik::findOrFail($id);
        $payload = $this->validatePeriode($request, $periode->id);

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
        $tanggalMulai = (string) ($request->input('tanggal_mulai') ?? $request->input('startDate') ?? '');
        $tanggalSelesai = (string) ($request->input('tanggal_selesai') ?? $request->input('endDate') ?? '');

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

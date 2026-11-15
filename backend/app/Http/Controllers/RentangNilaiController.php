<?php

namespace App\Http\Controllers;

use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\RentangNilai;
use App\Services\GradeCalculationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RentangNilaiController extends Controller
{
    public function __construct(
        private readonly GradeCalculationService $gradeService
    ) {}
    public function index(Request $request): JsonResponse
    {
        $periodeId = $this->resolvePeriodeId($request);

        $query = RentangNilai::with('periode')->orderByDesc('batas_bawah');
        if ($periodeId !== null) {
            $query->where('periode_id', $periodeId);
        }

        $items = $query->get()->map(fn (RentangNilai $r) => $this->formatRentang($r));

        return response()->json(['data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $periodeId = $this->resolvePeriodeId($request);
        if ($periodeId === null) {
            return response()->json(['message' => 'Periode akademik aktif belum tersedia.'], 422);
        }

        $payload = $this->validateRentang($request, $periodeId);
        $rentang = RentangNilai::create($payload);
        $rentang->load('periode');
        $this->recalculatePeriodeGrades($periodeId);

        return response()->json([
            'message' => 'Rentang nilai berhasil ditambahkan.',
            'data' => $this->formatRentang($rentang),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $rentang = RentangNilai::findOrFail($id);
        $targetPeriodeId = $this->resolvePeriodeId($request, $rentang->periode_id);
        $payload = $this->validateRentang($request, $targetPeriodeId, $rentang->id);
        $rentang->update($payload);
        $this->recalculatePeriodeGrades($targetPeriodeId);

        return response()->json([
            'message' => 'Rentang nilai berhasil diperbarui.',
            'data' => $this->formatRentang($rentang->fresh('periode')),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        $rentang = RentangNilai::findOrFail($id);
        $periodeId = $rentang->periode_id;
        $rentang->delete();
        $this->recalculatePeriodeGrades($periodeId);

        return response()->json(['message' => 'Rentang nilai berhasil dihapus.']);
    }

    private function recalculatePeriodeGrades(int $periodeId): void
    {
        $pengajaranList = Pengajaran::where('periode_id', $periodeId)->get();
        foreach ($pengajaranList as $pengajaran) {
            $this->gradeService->recalculateForPengajaran($pengajaran);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function formatRentang(RentangNilai $r): array
    {
        $lower = rtrim(rtrim(number_format((float) $r->batas_bawah, 2, '.', ''), '0'), '.');
        $upper = rtrim(rtrim(number_format((float) $r->batas_atas, 2, '.', ''), '0'), '.');

        return [
            'id' => (string) $r->id,
            'periode_id' => (string) $r->periode_id,
            'period' => $r->periode?->nama_periode ?? '',
            'grade' => $r->predikat,
            'predikat' => $r->predikat,
            'lower' => $lower,
            'upper' => $upper,
            'batas_bawah' => (float) $r->batas_bawah,
            'batas_atas' => (float) $r->batas_atas,
            'description' => (string) ($r->keterangan ?? ''),
            'keterangan' => (string) ($r->keterangan ?? ''),
        ];
    }

    private function resolvePeriodeId(Request $request, ?int $fallbackId = null): ?int
    {
        if ($request->filled('periode_id')) {
            return (int) $request->input('periode_id');
        }
        if ($request->filled('period')) {
            $byName = PeriodeAkademik::where('nama_periode', trim((string) $request->input('period')))->first();
            if ($byName) {
                return $byName->id;
            }
        }
        if ($fallbackId !== null) {
            return $fallbackId;
        }

        $active = PeriodeAkademik::where('is_active', true)->first()
            ?? PeriodeAkademik::orderByDesc('id')->first();

        return $active?->id;
    }

    /**
     * @return array<string, mixed>
     */
    private function validateRentang(Request $request, int $periodeId, ?int $ignoreId = null): array
    {
        $predikat = strtoupper(trim((string) ($request->input('predikat') ?? $request->input('grade') ?? '')));
        $lower = $request->input('batas_bawah') ?? $request->input('lower');
        $upper = $request->input('batas_atas') ?? $request->input('upper');
        $keterangan = trim((string) ($request->input('keterangan') ?? $request->input('description') ?? ''));

        if ($predikat === '' || ! is_numeric($lower) || ! is_numeric($upper)) {
            abort(response()->json(['message' => 'Predikat, batas bawah, dan batas atas wajib diisi.'], 422));
        }

        $lowerVal = (float) $lower;
        $upperVal = (float) $upper;

        if ($lowerVal < 0 || $upperVal > 100 || $lowerVal > $upperVal) {
            abort(response()->json([
                'message' => 'Rentang nilai harus berada pada 0–100 dan nilai minimum tidak boleh melebihi maksimum.',
            ], 422));
        }

        $existingQuery = RentangNilai::where('periode_id', $periodeId);
        if ($ignoreId !== null) {
            $existingQuery->where('id', '!=', $ignoreId);
        }
        $existingList = $existingQuery->get();

        foreach ($existingList as $other) {
            if (strtoupper($other->predikat) === $predikat) {
                abort(response()->json(['message' => 'Predikat tersebut sudah digunakan.'], 422));
            }
            if ($lowerVal <= (float) $other->batas_atas && $upperVal >= (float) $other->batas_bawah) {
                abort(response()->json([
                    'message' => 'Rentang nilai tidak boleh tumpang tindih dengan predikat lain.',
                ], 422));
            }
        }

        if ($ignoreId !== null || $existingList->count() >= 3) {
            $allRanges = $existingList
                ->map(fn (RentangNilai $r) => [
                    'predikat' => $r->predikat,
                    'lower' => (float) $r->batas_bawah,
                    'upper' => (float) $r->batas_atas,
                ])
                ->push([
                    'predikat' => $predikat,
                    'lower' => $lowerVal,
                    'upper' => $upperVal,
                ])
                ->sortBy('lower')
                ->values()
                ->all();

            for ($i = 1; $i < count($allRanges); $i++) {
                $prev = $allRanges[$i - 1];
                $curr = $allRanges[$i];
                if (($curr['lower'] - $prev['upper']) > 1.0) {
                    abort(response()->json([
                        'message' => "Rentang nilai tidak boleh menyisakan celah nilai antara predikat {$prev['predikat']} ({$prev['upper']}) dan {$curr['predikat']} ({$curr['lower']}).",
                    ], 422));
                }
            }
        }

        return [
            'periode_id' => $periodeId,
            'predikat' => $predikat,
            'batas_bawah' => round($lowerVal, 2),
            'batas_atas' => round($upperVal, 2),
            'keterangan' => $keterangan,
        ];
    }
}

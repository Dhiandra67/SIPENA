<?php

namespace App\Services;

use App\Models\KomponenNilai;
use App\Models\NilaiAkhirMapel;
use App\Models\NilaiDetail;
use App\Models\Pengajaran;
use App\Models\RentangNilai;
use Illuminate\Support\Collection;

class GradeCalculationService
{
    /**
     * Validasi bahwa setiap bobot > 0 dan <= 100 serta total bobot = 100%.
     *
     * @param   iterable<int, array{bobot_persen?: float|int|string, weight?: float|int|string}>  $components
     */
    public function hasValidWeights(iterable $components): bool
    {
        $count = 0;
        $total = 0.0;

        foreach ($components as $component) {
            $count++;
            $weight = (float) ($component['bobot_persen'] ?? $component['weight'] ?? 0);
            if ($weight <= 0 || $weight > 100) {
                return false;
            }
            $total += $weight;
        }

        return $count > 0 && abs($total - 100.0) < 0.01;
    }

    /**
     * Hitung ulang Nilai Akhir, Predikat, dan Ketuntasan untuk seluruh siswa pada satu pengajaran.
     */
    public function recalculateForPengajaran(Pengajaran $pengajaran): void
    {
        $pengajaran->loadMissing(['komponenNilai', 'kelas.anggotaKelas']);
        $komponenList = $pengajaran->komponenNilai;

        $weights = $komponenList->map(fn (KomponenNilai $k) => [
            'bobot_persen' => (float) $k->bobot_persen,
        ])->all();

        if (! $this->hasValidWeights($weights)) {
            NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)->delete();

            return;
        }

        $rentangList = $this->getRentangNilaiForPeriode($pengajaran->periode_id);
        $komponenIds = $komponenList->pluck('id')->all();
        $anggotaList = $pengajaran->kelas?->anggotaKelas ?? collect();

        $allDetails = NilaiDetail::whereIn('komponen_id', $komponenIds)
            ->whereIn('anggota_kelas_id', $anggotaList->pluck('id')->all())
            ->get()
            ->groupBy('anggota_kelas_id');

        $now = now();

        foreach ($anggotaList as $anggota) {
            /** @var Collection<int, NilaiDetail> $studentDetails */
            $studentDetails = ($allDetails->get($anggota->id) ?? collect())->keyBy('komponen_id');

            $isComplete = true;
            $weightedSum = 0.0;

            foreach ($komponenList as $komponen) {
                $detail = $studentDetails->get($komponen->id);
                if (! $detail || $detail->nilai_angka === null) {
                    $isComplete = false;
                    break;
                }

                $weightedSum += ((float) $detail->nilai_angka) * (((float) $komponen->bobot_persen) / 100.0);
            }

            if (! $isComplete) {
                NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)
                    ->where('anggota_kelas_id', $anggota->id)
                    ->delete();

                continue;
            }

            $nilaiAkhir = round($weightedSum, 2);
            $matchedRange = $this->resolvePredicate($nilaiAkhir, $rentangList);

            NilaiAkhirMapel::updateOrCreate(
                [
                    'pengajaran_id' => $pengajaran->id,
                    'anggota_kelas_id' => $anggota->id,
                ],
                [
                    'nilai_akhir' => $nilaiAkhir,
                    'predikat' => $matchedRange['predikat'],
                    'keterangan_predikat' => $matchedRange['keterangan'],
                    'is_tuntas' => $nilaiAkhir >= (float) $pengajaran->kkm,
                    'calculated_at' => $now,
                ]
            );
        }
    }

    /**
     * Hitung statistik kelas pada suatu pengajaran sesuai rumus SRS Bab 3.4.
     *
     * @return array<string, mixed>
     */
    public function calculateStatistics(Pengajaran $pengajaran): array
    {
        $pengajaran->loadMissing(['kelas.anggotaKelas', 'nilaiAkhirMapel']);
        $totalStudents = $pengajaran->kelas?->anggotaKelas->count() ?? 0;
        $finalGrades = $pengajaran->nilaiAkhirMapel;
        $completedCount = $finalGrades->count();

        $scores = $finalGrades->map(fn (NilaiAkhirMapel $item) => (float) $item->nilai_akhir)->values();
        $average = $completedCount > 0 ? round($scores->avg(), 2) : null;
        $highest = $completedCount > 0 ? round((float) $scores->max(), 2) : null;
        $lowest = $completedCount > 0 ? round((float) $scores->min(), 2) : null;
        $passingCount = $finalGrades->where('is_tuntas', true)->count();
        $passRate = $completedCount > 0 ? round(($passingCount / $completedCount) * 100, 2) : 0.0;

        $rentangList = $this->getRentangNilaiForPeriode($pengajaran->periode_id);
        $distribution = array_map(function (array $range) use ($finalGrades): array {
            $count = $finalGrades->where('predikat', $range['predikat'])->count();

            return [
                'predikat' => $range['predikat'],
                'batas_bawah' => $range['batas_bawah'],
                'batas_atas' => $range['batas_atas'],
                'keterangan' => $range['keterangan'],
                'jumlah' => $count,
            ];
        }, $rentangList);

        return [
            'pengajaran_id' => (string) $pengajaran->id,
            'kkm' => (float) $pengajaran->kkm,
            'jumlah_siswa' => $totalStudents,
            'nilai_lengkap' => $completedCount,
            'rata_rata' => $average,
            'nilai_tertinggi' => $highest,
            'nilai_terendah' => $lowest,
            'jumlah_tuntas' => $passingCount,
            'persentase_ketuntasan' => $passRate,
            'distribusi_predikat' => $distribution,
        ];
    }

    /**
     * @return array<int, array{predikat: string, batas_bawah: float, batas_atas: float, keterangan: string}>
     */
    public function getRentangNilaiForPeriode(?int $periodeId): array
    {
        if ($periodeId !== null) {
            $ranges = RentangNilai::where('periode_id', $periodeId)
                ->orderByDesc('batas_bawah')
                ->get();

            if ($ranges->isNotEmpty()) {
                return $ranges->map(fn (RentangNilai $r) => [
                    'predikat' => $r->predikat,
                    'batas_bawah' => (float) $r->batas_bawah,
                    'batas_atas' => (float) $r->batas_atas,
                    'keterangan' => (string) ($r->keterangan ?? ''),
                ])->all();
            }
        }

        return [
            ['predikat' => 'A', 'batas_bawah' => 85.00, 'batas_atas' => 100.00, 'keterangan' => 'Sangat Baik'],
            ['predikat' => 'B', 'batas_bawah' => 70.00, 'batas_atas' => 84.99, 'keterangan' => 'Baik'],
            ['predikat' => 'C', 'batas_bawah' => 55.00, 'batas_atas' => 69.99, 'keterangan' => 'Cukup'],
            ['predikat' => 'D', 'batas_bawah' => 0.00, 'batas_atas' => 54.99, 'keterangan' => 'Perlu Bimbingan'],
        ];
    }

    /**
     * @param  array<int, array{predikat: string, batas_bawah: float, batas_atas: float, keterangan: string}>  $rentangList
     * @return array{predikat: string, keterangan: string}
     */
    private function resolvePredicate(float $nilaiAkhir, array $rentangList): array
    {
        foreach ($rentangList as $range) {
            if ($nilaiAkhir >= $range['batas_bawah'] && $nilaiAkhir <= $range['batas_atas']) {
                return [
                    'predikat' => $range['predikat'],
                    'keterangan' => $range['keterangan'],
                ];
            }
        }

        return [
            'predikat' => 'D',
            'keterangan' => 'Perlu Bimbingan',
        ];
    }
}

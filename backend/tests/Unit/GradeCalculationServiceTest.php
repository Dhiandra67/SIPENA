<?php

namespace Tests\Unit;

use App\Models\AnggotaKelas;
use App\Models\NilaiAkhirMapel;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\RentangNilai;
use App\Models\Siswa;
use App\Services\GradeCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class GradeCalculationServiceTest extends TestCase
{
    use RefreshDatabase;

    private GradeCalculationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed();
        $this->service = app(GradeCalculationService::class);
    }

    public function test_it_accepts_only_positive_weights_with_a_total_of_one_hundred(): void
    {
        $this->assertTrue($this->service->hasValidWeights([
            ['bobot_persen' => 20],
            ['weight' => '25'],
            ['bobot_persen' => 25],
            ['weight' => 30],
        ]));

        $this->assertFalse($this->service->hasValidWeights([]));
        $this->assertFalse($this->service->hasValidWeights([
            ['weight' => 60],
            ['weight' => 39.98],
        ]));
        $this->assertFalse($this->service->hasValidWeights([
            ['weight' => 0],
            ['weight' => 100],
        ]));
        $this->assertFalse($this->service->hasValidWeights([
            ['weight' => 101],
        ]));
    }

    public function test_it_recalculates_complete_grades_and_removes_incomplete_results(): void
    {
        $pengajaran = $this->mathematicsForClass('VII-A');
        $intan = Siswa::where('nis', '2026009')->firstOrFail();
        $intanMembership = $intan->anggotaKelas()->firstOrFail();

        $staleGrade = NilaiAkhirMapel::create([
            'pengajaran_id' => $pengajaran->id,
            'anggota_kelas_id' => $intanMembership->id,
            'nilai_akhir' => 90,
            'predikat' => 'A',
            'keterangan_predikat' => 'Sangat Baik',
            'is_tuntas' => true,
            'calculated_at' => now(),
        ]);

        $komponen = $pengajaran->komponenNilai()
            ->where('nama_komponen', 'Tugas Harian')
            ->firstOrFail();
        $andi = Siswa::where('nis', '2026001')->firstOrFail();
        $andiMembership = $andi->anggotaKelas()->firstOrFail();
        $andiDetail = $komponen->nilaiDetail()
            ->where('anggota_kelas_id', $andiMembership->id)
            ->firstOrFail();
        $andiDetail->update(['nilai_angka' => 100]);

        $this->service->recalculateForPengajaran($pengajaran->fresh());

        $this->assertDatabaseMissing('nilai_akhir_mapel', ['id' => $staleGrade->id]);
        $this->assertSame(
            '89.50',
            NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)
                ->where('anggota_kelas_id', $andiMembership->id)
                ->value('nilai_akhir'),
        );
    }

    public function test_it_removes_final_grades_when_component_weights_are_invalid(): void
    {
        $pengajaran = $this->mathematicsForClass('VII-A');
        $pengajaran->komponenNilai()->firstOrFail()->update(['bobot_persen' => 0]);

        $this->service->recalculateForPengajaran($pengajaran->fresh());

        $this->assertDatabaseMissing('nilai_akhir_mapel', [
            'pengajaran_id' => $pengajaran->id,
        ]);
    }

    public function test_it_calculates_statistics_for_complete_and_incomplete_students(): void
    {
        $pengajaran = $this->mathematicsForClass('VII-A');

        $this->assertSame([
            'pengajaran_id' => (string) $pengajaran->id,
            'kkm' => 75.0,
            'jumlah_siswa' => 5,
            'nilai_lengkap' => 3,
            'rata_rata' => 85.77,
            'nilai_tertinggi' => 91.1,
            'nilai_terendah' => 79.1,
            'jumlah_tuntas' => 3,
            'persentase_ketuntasan' => 100.0,
            'distribusi_predikat' => [
                [
                    'predikat' => 'A',
                    'batas_bawah' => 85.0,
                    'batas_atas' => 100.0,
                    'keterangan' => 'Sangat Baik',
                    'jumlah' => 2,
                ],
                [
                    'predikat' => 'B',
                    'batas_bawah' => 70.0,
                    'batas_atas' => 84.99,
                    'keterangan' => 'Baik',
                    'jumlah' => 1,
                ],
                [
                    'predikat' => 'C',
                    'batas_bawah' => 55.0,
                    'batas_atas' => 69.99,
                    'keterangan' => 'Cukup',
                    'jumlah' => 0,
                ],
                [
                    'predikat' => 'D',
                    'batas_bawah' => 0.0,
                    'batas_atas' => 54.99,
                    'keterangan' => 'Perlu Bimbingan',
                    'jumlah' => 0,
                ],
            ],
        ], $this->service->calculateStatistics($pengajaran));
    }

    public function test_statistics_for_empty_grades_use_null_scores_and_zero_pass_rate(): void
    {
        $pengajaran = $this->mathematicsForClass('VII-A');
        NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)->delete();

        $statistics = $this->service->calculateStatistics($pengajaran->fresh());

        $this->assertSame(5, $statistics['jumlah_siswa']);
        $this->assertSame(0, $statistics['nilai_lengkap']);
        $this->assertNull($statistics['rata_rata']);
        $this->assertNull($statistics['nilai_tertinggi']);
        $this->assertNull($statistics['nilai_terendah']);
        $this->assertSame(0, $statistics['jumlah_tuntas']);
        $this->assertSame(0.0, $statistics['persentase_ketuntasan']);
    }

    public function test_it_uses_period_ranges_and_provides_defaults_when_none_exist(): void
    {
        $activePeriod = PeriodeAkademik::where('is_active', true)->firstOrFail();

        $this->assertSame(
            'A',
            $this->service->getRentangNilaiForPeriode($activePeriod->id)[0]['predikat'],
        );

        $periodWithoutRanges = PeriodeAkademik::create([
            'tahun_ajaran' => '2027/2028',
            'semester' => 'GANJIL',
            'nama_periode' => '2027/2028 · Ganjil',
            'tanggal_mulai' => '2027-07-12',
            'tanggal_selesai' => '2027-12-18',
            'is_active' => false,
        ]);

        $fallbackRanges = $this->service->getRentangNilaiForPeriode($periodWithoutRanges->id);

        $this->assertCount(4, $fallbackRanges);
        $this->assertSame('A', $fallbackRanges[0]['predikat']);
        $this->assertSame('Perlu Bimbingan', $fallbackRanges[3]['keterangan']);
        $this->assertSame(
            4,
            RentangNilai::where('periode_id', $activePeriod->id)->count(),
        );
    }

    public function test_statistics_use_a_bounded_number_of_queries_as_class_size_grows(): void
    {
        $pengajaran = $this->mathematicsForClass('VII-A');
        $statisticsAssignment = $pengajaran->fresh();
        $kelas = $pengajaran->kelas;

        for ($index = 0; $index < 20; $index++) {
            $student = Siswa::create([
                'nis' => 'PERF'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                'nisn' => 'PERF'.str_pad((string) $index, 4, '0', STR_PAD_LEFT),
                'nama_lengkap' => 'Siswa Uji '.$index,
                'jenis_kelamin' => 'L',
                'status' => 'AKTIF',
            ]);

            AnggotaKelas::create([
                'kelas_id' => $kelas->id,
                'siswa_id' => $student->id,
            ]);
        }

        DB::flushQueryLog();
        DB::enableQueryLog();

        $statistics = $this->service->calculateStatistics($statisticsAssignment);
        $selectCount = collect(DB::getQueryLog())
            ->filter(fn (array $query) => str_starts_with(strtolower(ltrim($query['query'])), 'select'))
            ->count();

        DB::disableQueryLog();

        $this->assertSame(25, $statistics['jumlah_siswa']);
        $this->assertLessThanOrEqual(
            4,
            $selectCount,
            'Statistic calculation should use a bounded number of SELECT queries.',
        );
    }

    private function mathematicsForClass(string $className): Pengajaran
    {
        return Pengajaran::whereHas('kelas', fn ($query) => $query->where('kode_kelas', $className))
            ->whereHas('mataPelajaran', fn ($query) => $query->where('kode_mapel', 'MAT'))
            ->firstOrFail();
    }
}

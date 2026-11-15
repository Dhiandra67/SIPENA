<?php

namespace Tests\Feature;

use App\Models\KomponenNilai;
use App\Models\NilaiAkhirMapel;
use App\Models\Pengajaran;
use App\Models\PeriodeAkademik;
use App\Models\Siswa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicGradingSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_migrations_and_initial_seeder_populate_master_and_grading_tables(): void
    {
        $this->seed();

        $periodeAktif = PeriodeAkademik::where('is_active', true)->first();
        $this->assertNotNull($periodeAktif);
        $this->assertSame('2026/2027 · Ganjil', $periodeAktif->nama_periode);

        $this->assertDatabaseCount('rentang_nilai', 4);
        $this->assertDatabaseCount('mata_pelajaran', 5);
        $this->assertDatabaseCount('guru', 3);
        $this->assertDatabaseCount('kelas', 4);
        $this->assertDatabaseCount('siswa', 14);
        $this->assertDatabaseCount('anggota_kelas', 14);
        $this->assertDatabaseCount('pengajaran', 5);

        // Total bobot komponen pada setiap pengajaran wajib 100%
        $pengajaranList = Pengajaran::with('komponenNilai')->get();
        foreach ($pengajaranList as $pengajaran) {
            $totalBobot = $pengajaran->komponenNilai->sum(fn (KomponenNilai $k) => (float) $k->bobot_persen);
            $this->assertEqualsWithDelta(100.0, $totalBobot, 0.001);
        }

        // Cek kalkulasi nilai akhir Andi Pratama (2026001) di Matematika VII-A:
        // (88 * 20%) + (84 * 25%) + (86 * 25%) + (90 * 30%) = 17.6 + 21 + 21.5 + 27 = 87.10 (Predikat A, Tuntas)
        $andi = Siswa::where('nis', '2026001')->firstOrFail();
        $anggotaAndi = $andi->anggotaKelas()->firstOrFail();
        $nilaiAkhirAndi = NilaiAkhirMapel::where('anggota_kelas_id', $anggotaAndi->id)->firstOrFail();

        $this->assertSame('87.10', $nilaiAkhirAndi->nilai_akhir);
        $this->assertSame('A', $nilaiAkhirAndi->predikat);
        $this->assertSame('Sangat Baik', $nilaiAkhirAndi->keterangan_predikat);
        $this->assertTrue($nilaiAkhirAndi->is_tuntas);
    }
}

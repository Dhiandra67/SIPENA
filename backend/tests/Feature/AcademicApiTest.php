<?php

namespace Tests\Feature;

use App\Models\KomponenNilai;
use App\Models\NilaiAkhirMapel;
use App\Models\Pengajaran;
use App\Models\Siswa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AcademicApiTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(string $email, string $password): string
    {
        return $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => $password,
        ])->assertOk()->json('accessToken');
    }

    public function test_admin_can_fetch_overview_and_manage_master_students_and_teachers(): void
    {
        $this->seed();
        $token = $this->loginAs('test@example.com', 'password');

        $this->withToken($token)
            ->getJson('/api/v1/admin/overview')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [
                    'academic',
                    'grades',
                    'subjects',
                    'classes',
                    'teachers',
                    'students',
                    'assignments',
                ],
            ]);

        // Tambah siswa baru
        $createStudent = $this->withToken($token)
            ->postJson('/api/v1/siswa', [
                'nis' => '2026099',
                'nisn' => '0123456799',
                'name' => 'Zaki Pratama',
                'gender' => 'L',
                'className' => 'VII-A',
                'status' => 'Aktif',
            ])
            ->assertCreated()
            ->assertJsonPath('data.nis', '2026099')
            ->assertJsonPath('data.className', 'VII-A');

        $studentId = $createStudent->json('data.id');

        // Update siswa
        $this->withToken($token)
            ->putJson("/api/v1/siswa/{$studentId}", [
                'nis' => '2026099',
                'nisn' => '0123456799',
                'name' => 'Zaki Pratama Putra',
                'gender' => 'L',
                'className' => 'VII-B',
                'status' => 'Aktif',
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Zaki Pratama Putra')
            ->assertJsonPath('data.className', 'VII-B');

        // Tambah guru baru (sekaligus membuat user login)
        $this->withToken($token)
            ->postJson('/api/v1/guru', [
                'nip' => '199205122019031009',
                'name' => 'Hendra Wijaya, S.Pd.',
                'gender' => 'L',
                'email' => 'hendra@sekolah.sch.id',
                'status' => 'Aktif',
            ])
            ->assertCreated()
            ->assertJsonPath('data.email', 'hendra@sekolah.sch.id');

        $this->assertDatabaseHas('users', [
            'email' => 'hendra@sekolah.sch.id',
            'role' => 'teacher',
        ]);
    }

    public function test_teacher_cannot_access_admin_write_endpoints(): void
    {
        $this->seed();
        $teacherToken = $this->loginAs('guru@example.com', 'guru12345');

        $this->withToken($teacherToken)
            ->getJson('/api/v1/admin/overview')
            ->assertForbidden();

        $this->withToken($teacherToken)
            ->postJson('/api/v1/mapel', [
                'code' => 'PKN',
                'name' => 'Pendidikan Pancasila',
                'group' => 'Umum',
                'kkm' => 75,
            ])
            ->assertForbidden();
    }

    public function test_teacher_can_validate_components_input_grades_and_view_statistics(): void
    {
        $this->seed();
        $teacherToken = $this->loginAs('guru@example.com', 'guru12345');

        $pengajaran = Pengajaran::whereHas('kelas', fn ($q) => $q->where('kode_kelas', 'VII-A'))->firstOrFail();

        // Validasi penolakan jika total bobot != 100%
        $this->withToken($teacherToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}/komponen", [
                'components' => [
                    ['name' => 'Tugas Harian', 'weight' => 30],
                    ['name' => 'UAS', 'weight' => 50],
                ],
            ])
            ->assertStatus(422);

        // Simpan komponen dengan total bobot = 100%
        $this->withToken($teacherToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}/komponen", [
                'components' => [
                    ['name' => 'Tugas Harian', 'weight' => 20],
                    ['name' => 'Ulangan Harian', 'weight' => 25],
                    ['name' => 'STS', 'weight' => 25],
                    ['name' => 'UAS', 'weight' => 30],
                ],
            ])
            ->assertOk();

        // Lengkapi nilai UAS Intan Permata (2026009) di VII-A
        $intan = Siswa::where('nis', '2026009')->firstOrFail();
        $uasKomponen = KomponenNilai::where('pengajaran_id', $pengajaran->id)
            ->where('nama_komponen', 'UAS')
            ->firstOrFail();

        $this->withToken($teacherToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}/nilai", [
                'scores' => [
                    (string) $intan->id => [
                        (string) $uasKomponen->id => '80',
                    ],
                ],
            ])
            ->assertOk();

        // Nilai Intan: (70*20%) + (74*25%) + (72*25%) + (80*30%) = 14 + 18.5 + 18 + 24 = 74.50 (Predikat B, Belum Tuntas karena KKM 75)
        $anggotaIntan = $intan->anggotaKelas()->firstOrFail();
        $rekapIntan = NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)
            ->where('anggota_kelas_id', $anggotaIntan->id)
            ->firstOrFail();

        $this->assertSame('74.50', $rekapIntan->nilai_akhir);
        $this->assertSame('B', $rekapIntan->predikat);
        $this->assertFalse($rekapIntan->is_tuntas);

        // Statistik kelas
        $this->withToken($teacherToken)
            ->getJson("/api/v1/pengajaran/{$pengajaran->id}/statistik")
            ->assertOk()
            ->assertJsonPath('data.jumlah_siswa', 5)
            ->assertJsonPath('data.nilai_lengkap', 4);
    }
}

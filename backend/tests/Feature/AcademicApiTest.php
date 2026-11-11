<?php

namespace Tests\Feature;

use App\Models\KomponenNilai;
use App\Models\NilaiAkhirMapel;
use App\Models\NilaiDetail;
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

    public function test_teacher_cannot_submit_duplicate_component_ids(): void
    {
        $this->seed();
        $teacherToken = $this->loginAs('guru@example.com', 'guru12345');
        $pengajaran = Pengajaran::whereHas('kelas', fn ($q) => $q->where('kode_kelas', 'VII-A'))->firstOrFail();
        $components = $pengajaran->komponenNilai()->orderBy('urutan')->get();
        $detailsBefore = NilaiDetail::count();

        $this->withToken($teacherToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}/komponen", [
                'components' => [
                    ['id' => $components[0]->id, 'name' => 'Tugas Harian', 'weight' => 50],
                    ['id' => $components[0]->id, 'name' => 'UAS', 'weight' => 50],
                ],
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'ID komponen tidak boleh digunakan lebih dari satu kali.');

        $this->assertSame(4, $pengajaran->komponenNilai()->count());
        $this->assertSame($detailsBefore, NilaiDetail::count());
        $this->assertDatabaseHas('nilai_akhir_mapel', [
            'pengajaran_id' => $pengajaran->id,
            'anggota_kelas_id' => $pengajaran->kelas->anggotaKelas()->firstOrFail()->id,
        ]);
    }

    public function test_updating_assignment_kkm_recalculates_student_passing_status(): void
    {
        $this->seed();
        $adminToken = $this->loginAs('test@example.com', 'password');
        $teacherToken = $this->loginAs('guru@example.com', 'guru12345');
        $pengajaran = Pengajaran::with(['guru', 'mataPelajaran', 'kelas', 'periode'])
            ->whereHas('kelas', fn ($q) => $q->where('kode_kelas', 'VII-A'))
            ->firstOrFail();

        $intan = Siswa::where('nis', '2026009')->firstOrFail();
        $anggotaIntan = $intan->anggotaKelas()->firstOrFail();
        $uasKomponen = $pengajaran->komponenNilai()
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

        $nilaiSebelum = NilaiAkhirMapel::where('pengajaran_id', $pengajaran->id)
            ->where('anggota_kelas_id', $anggotaIntan->id)
            ->firstOrFail();
        $this->assertSame('74.50', $nilaiSebelum->nilai_akhir);
        $this->assertFalse($nilaiSebelum->is_tuntas);

        $this->withToken($adminToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}", [
                'teacher' => $pengajaran->guru->nama_lengkap,
                'subject' => $pengajaran->mataPelajaran->nama_mapel,
                'className' => $pengajaran->kelas->nama_kelas,
                'period' => $pengajaran->periode->nama_periode,
                'kkm' => 74.5,
            ])
            ->assertOk();

        $nilaiSesudah = $nilaiSebelum->fresh();
        $this->assertSame('74.50', $nilaiSesudah->nilai_akhir);
        $this->assertTrue($nilaiSesudah->is_tuntas);
    }

    public function test_admin_can_reset_teacher_password(): void
    {
        $this->seed();

        $adminToken = $this->loginAs('test@example.com', 'password');

        $createRes = $this->withToken($adminToken)
            ->postJson('/api/v1/guru', [
                'nip' => '199305052020011055',
                'name' => 'Fajar Nugroho, S.Pd.',
                'gender' => 'L',
                'email' => 'fajar@sekolah.sch.id',
                'status' => 'Aktif',
            ])
            ->assertCreated();

        $guruId = $createRes->json('data.id');

        $this->withToken($adminToken)
            ->postJson("/api/v1/guru/{$guruId}/reset-password", [
                'password' => 'sandibaru123',
            ])
            ->assertOk()
            ->assertJsonPath('defaultPassword', 'sandibaru123');

        $this->postJson('/api/auth/login', [
            'email' => 'fajar@sekolah.sch.id',
            'password' => 'sandibaru123',
        ])->assertOk();
    }

    public function test_admin_can_toggle_assignment_lock_and_locked_assignment_blocks_teacher_updates(): void
    {
        $this->seed();

        $adminToken = $this->loginAs('test@example.com', 'password');
        $teacherToken = $this->loginAs('guru@example.com', 'guru12345');

        $pengajaran = Pengajaran::whereHas('kelas', fn ($q) => $q->where('kode_kelas', 'VII-A'))->firstOrFail();

        // Admin mengunci nilai pengajaran
        $this->withToken($adminToken)
            ->patchJson("/api/v1/pengajaran/{$pengajaran->id}/toggle-lock")
            ->assertOk()
            ->assertJsonPath('data.is_locked', true)
            ->assertJsonPath('data.lockStatus', 'Terkunci');

        // Guru ditolak saat mencoba mengubah nilai ketika terkunci
        $this->withToken($teacherToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}/nilai", [
                'scores' => [],
            ])
            ->assertStatus(422);

        // Admin membuka kembali kunci nilai
        $this->withToken($adminToken)
            ->patchJson("/api/v1/pengajaran/{$pengajaran->id}/toggle-lock")
            ->assertOk()
            ->assertJsonPath('data.is_locked', false)
            ->assertJsonPath('data.lockStatus', 'Terbuka');
    }

    public function test_deactivated_teacher_cannot_login_and_tokens_are_revoked_on_reset_or_deactivation(): void
    {
        $this->seed();

        $adminToken = $this->loginAs('test@example.com', 'password');

        $createRes = $this->withToken($adminToken)
            ->postJson('/api/v1/guru', [
                'nip' => '199305052020011077',
                'name' => 'Rina Kartika, S.Pd.',
                'gender' => 'P',
                'email' => 'rina@sekolah.sch.id',
                'status' => 'Aktif',
            ])
            ->assertCreated();

        $guruId = $createRes->json('data.id');
        $rinaToken = $this->loginAs('rina@sekolah.sch.id', 'guru12345');

        // Reset password mencabut token aktif Rina
        $this->withToken($adminToken)
            ->postJson("/api/v1/guru/{$guruId}/reset-password", [
                'password' => 'rinabaru123',
            ])
            ->assertOk();

        $this->withToken($rinaToken)
            ->getJson('/api/v1/guru/dashboard')
            ->assertUnauthorized();

        // Login ulang dengan password baru lalu nonaktifkan guru
        $newRinaToken = $this->loginAs('rina@sekolah.sch.id', 'rinabaru123');

        $this->withToken($adminToken)
            ->putJson("/api/v1/guru/{$guruId}", [
                'nip' => '199305052020011077',
                'name' => 'Rina Kartika, S.Pd.',
                'gender' => 'P',
                'email' => 'rina@sekolah.sch.id',
                'status' => 'Nonaktif',
            ])
            ->assertOk();

        // Token yang sudah ada langsung ditolak (401) dan login baru ditolak (403)
        $this->withToken($newRinaToken)
            ->getJson('/api/v1/guru/dashboard')
            ->assertUnauthorized();

        $this->postJson('/api/auth/login', [
            'email' => 'rina@sekolah.sch.id',
            'password' => 'rinabaru123',
        ])->assertForbidden();
    }

    public function test_updating_locked_assignment_preserves_lock_and_grade_range_rejects_large_gaps(): void
    {
        $this->seed();
        $adminToken = $this->loginAs('test@example.com', 'password');

        $pengajaran = Pengajaran::with(['guru', 'mataPelajaran', 'kelas', 'periode'])
            ->whereHas('kelas', fn ($q) => $q->where('kode_kelas', 'VII-A'))
            ->firstOrFail();

        // Kunci pengajaran terlebih dahulu
        $this->withToken($adminToken)
            ->patchJson("/api/v1/pengajaran/{$pengajaran->id}/toggle-lock")
            ->assertOk()
            ->assertJsonPath('data.is_locked', true);

        // Edit pengajaran tanpa mengirim field is_locked -> harus tetap terkunci
        $this->withToken($adminToken)
            ->putJson("/api/v1/pengajaran/{$pengajaran->id}", [
                'teacher' => $pengajaran->guru->nama_lengkap,
                'subject' => $pengajaran->mataPelajaran->nama_mapel,
                'className' => $pengajaran->kelas->nama_kelas,
                'period' => $pengajaran->periode->nama_periode,
            ])
            ->assertOk()
            ->assertJsonPath('data.is_locked', true)
            ->assertJsonPath('data.lockStatus', 'Terkunci');

        // Coba ubah rentang nilai B menjadi 75-80 sehingga muncul celah > 1 poin antara B (80) dan A (85)
        $rentangB = \App\Models\RentangNilai::where('predikat', 'B')->firstOrFail();
        $this->withToken($adminToken)
            ->putJson("/api/v1/rentang-nilai/{$rentangB->id}", [
                'letter' => 'B',
                'lower' => 75,
                'upper' => 80,
                'description' => 'Baik',
            ])
            ->assertStatus(422);
    }

    public function test_admin_can_copy_period_classes_and_assignments(): void
    {
        $this->seed();
        $adminToken = $this->loginAs('test@example.com', 'password');

        // Buat periode akademik baru
        $newPeriodRes = $this->withToken($adminToken)
            ->postJson('/api/v1/periode', [
                'year' => '2026/2027',
                'semester' => 'Genap',
                'status' => 'Tidak Aktif',
                'start' => '2027-01-04',
                'end' => '2027-06-25',
            ])
            ->assertCreated();

        $targetPeriodId = $newPeriodRes->json('data.id');
        $sourcePeriod = \App\Models\PeriodeAkademik::where('is_active', true)->firstOrFail();

        // Salin kelas, anggota siswa, dan penugasan dari Ganjil ke Genap
        $this->withToken($adminToken)
            ->postJson("/api/v1/periode/{$targetPeriodId}/copy-from", [
                'source_periode_id' => $sourcePeriod->id,
                'mode' => 'same_class',
                'copy_students' => true,
                'copy_assignments' => true,
            ])
            ->assertOk()
            ->assertJsonPath('data.copiedClasses', 4);
    }
}

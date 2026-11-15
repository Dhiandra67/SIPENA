<?php

namespace Tests\Feature;

use App\Models\Kelas;
use App\Models\NilaiAkhirMapel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminClassRecapTest extends TestCase
{
    use RefreshDatabase;

    private function loginAs(string $email, string $password): string
    {
        return $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => $password,
        ])->assertOk()->json('accessToken');
    }

    public function test_admin_can_fetch_persisted_class_recap(): void
    {
        $this->seed();
        $token = $this->loginAs('test@example.com', 'password');

        $kelas = Kelas::where('kode_kelas', 'VII-A')->firstOrFail();
        $nilai = NilaiAkhirMapel::whereHas('pengajaran', fn ($q) => $q->where('kelas_id', $kelas->id))
            ->with('anggotaKelas')
            ->firstOrFail();

        $response = $this->withToken($token)
            ->getJson("/api/v1/kelas/{$kelas->id}/rekap")
            ->assertOk()
            ->assertJsonPath('data.class.code', 'VII-A')
            ->assertJsonStructure([
                'data' => [
                    'class' => ['id', 'code', 'name', 'period'],
                    'subjects' => [['id', 'code', 'name']],
                    'students' => [['id', 'nis', 'nisn', 'name', 'scores']],
                ],
            ]);

        $student = collect($response->json('data.students'))
            ->firstWhere('id', (string) $nilai->anggotaKelas->siswa_id);

        $this->assertNotNull($student);
        $this->assertEqualsWithDelta(
            (float) $nilai->nilai_akhir,
            $student['scores'][(string) $nilai->pengajaran_id],
            0.001,
        );
    }

    public function test_teacher_cannot_fetch_class_recap(): void
    {
        $this->seed();
        $token = $this->loginAs('guru@example.com', 'guru12345');
        $kelas = Kelas::firstOrFail();

        $this->withToken($token)
            ->getJson("/api/v1/kelas/{$kelas->id}/rekap")
            ->assertForbidden();
    }
}

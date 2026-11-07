<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_user_can_log_in_and_receive_a_hashed_api_token(): void
    {
        $this->seed();

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('user.name', 'Admin Demo')
            ->assertJsonPath('user.email', 'test@example.com')
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonStructure(['accessToken', 'user' => ['id', 'name', 'email', 'role']]);

        $plainTextToken = $response->json('accessToken');
        $this->assertDatabaseHas('api_tokens', [
            'user_id' => 1,
            'token_hash' => hash('sha256', $plainTextToken),
        ]);
        $this->assertNotSame($plainTextToken, DB::table('api_tokens')->value('token_hash'));
    }

    public function test_demo_teacher_can_log_in_with_the_teacher_role(): void
    {
        $this->seed();

        $this->postJson('/api/auth/login', [
            'email' => 'guru@example.com',
            'password' => 'guru12345',
        ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Guru Demo')
            ->assertJsonPath('user.email', 'guru@example.com')
            ->assertJsonPath('user.role', 'teacher');
    }

    public function test_login_rejects_an_incorrect_password(): void
    {
        $this->seed();

        $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'incorrect',
        ])
            ->assertUnauthorized()
            ->assertJsonPath('message', 'Email atau kata sandi tidak valid. Silakan coba lagi.');
    }

    public function test_api_token_can_restore_and_revoke_the_session(): void
    {
        $this->seed();

        $token = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ])->assertOk()->json('accessToken');

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', 'test@example.com');

        $this->withToken($token)
            ->postJson('/api/auth/logout')
            ->assertOk();

        $this->withToken($token)
            ->getJson('/api/auth/me')
            ->assertUnauthorized();
    }

    public function test_protected_session_endpoint_rejects_missing_tokens(): void
    {
        $this->getJson('/api/auth/me')->assertUnauthorized();
    }
}

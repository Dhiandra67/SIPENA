<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthTest extends TestCase
{
    public function test_home_page_displays_the_sipena_application(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertSee('Selamat datang di SIPENA');
    }

    public function test_application_health_endpoint_is_available(): void
    {
        $this->getJson('/health')
            ->assertOk()
            ->assertExactJson(['status' => 'ok']);
    }

    public function test_database_health_endpoint_uses_the_configured_database(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertExactJson([
                'status' => 'ok',
                'database' => 'connected',
            ]);
    }
}

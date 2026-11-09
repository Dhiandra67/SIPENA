<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new \RuntimeException('The demo account can only be seeded in local or testing environments.');
        }

        User::updateOrCreate(['email' => 'test@example.com'], [
            'name' => 'Admin Demo',
            'role' => 'admin',
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        User::updateOrCreate(['email' => 'guru@example.com'], [
            'name' => 'Guru Demo',
            'role' => 'teacher',
            'email' => 'guru@example.com',
            'password' => 'guru12345',
        ]);
    }
}

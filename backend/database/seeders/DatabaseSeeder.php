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
        $adminEmail = (string) env('ADMIN_EMAIL', 'test@example.com');
        $adminName = (string) env('ADMIN_NAME', 'Admin Demo');
        $adminPassword = (string) env('ADMIN_PASSWORD', 'password');

        User::updateOrCreate(['email' => $adminEmail], [
            'name' => $adminName,
            'role' => 'admin',
            'email' => $adminEmail,
            'password' => $adminPassword,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'guru@example.com'], [
            'name' => 'Guru Demo',
            'role' => 'teacher',
            'email' => 'guru@example.com',
            'password' => 'guru12345',
            'is_active' => true,
        ]);

        $this->call(AcademicGradingSeeder::class);
    }
}

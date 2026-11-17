<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('periode_guru', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')
                ->constrained('periode_akademik')
                ->cascadeOnDelete();
            $table->foreignId('guru_id')
                ->constrained('guru')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['periode_id', 'guru_id']);
        });

        Schema::create('periode_mata_pelajaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')
                ->constrained('periode_akademik')
                ->cascadeOnDelete();
            $table->foreignId('mapel_id')
                ->constrained('mata_pelajaran')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['periode_id', 'mapel_id']);
        });

        $activePeriodeId = DB::table('periode_akademik')
            ->where('is_active', true)
            ->value('id')
            ?? DB::table('periode_akademik')->orderByDesc('id')->value('id');

        if ($activePeriodeId) {
            $now = now();
            foreach (DB::table('guru')->pluck('id') as $guruId) {
                DB::table('periode_guru')->updateOrInsert(
                    ['periode_id' => $activePeriodeId, 'guru_id' => $guruId],
                    ['created_at' => $now, 'updated_at' => $now]
                );
            }
            foreach (DB::table('mata_pelajaran')->pluck('id') as $mapelId) {
                DB::table('periode_mata_pelajaran')->updateOrInsert(
                    ['periode_id' => $activePeriodeId, 'mapel_id' => $mapelId],
                    ['created_at' => $now, 'updated_at' => $now]
                );
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('periode_mata_pelajaran');
        Schema::dropIfExists('periode_guru');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pengajaran_guru', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengajaran_id')
                ->constrained('pengajaran')
                ->cascadeOnDelete();
            $table->foreignId('guru_id')
                ->constrained('guru')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['pengajaran_id', 'guru_id']);
        });

        $now = now();
        DB::table('pengajaran')->whereNotNull('guru_id')->orderBy('id')->each(
            fn (object $pengajaran) => DB::table('pengajaran_guru')->insertOrIgnore([
                'pengajaran_id' => $pengajaran->id,
                'guru_id' => $pengajaran->guru_id,
                'created_at' => $now,
                'updated_at' => $now,
            ])
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('pengajaran_guru');
    }
};

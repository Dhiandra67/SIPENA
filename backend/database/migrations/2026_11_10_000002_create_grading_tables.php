<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('pengajaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')
                ->constrained('periode_akademik')
                ->cascadeOnDelete();
            $table->foreignId('kelas_id')
                ->constrained('kelas')
                ->cascadeOnDelete();
            $table->foreignId('mapel_id')
                ->constrained('mata_pelajaran')
                ->cascadeOnDelete();
            $table->foreignId('guru_id')
                ->constrained('guru')
                ->cascadeOnDelete();
            $table->decimal('kkm', 5, 2)->default(75.00);
            $table->boolean('is_locked')->default(false);
            $table->timestamps();

            $table->unique(['periode_id', 'kelas_id', 'mapel_id']);
        });

        Schema::create('komponen_nilai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengajaran_id')
                ->constrained('pengajaran')
                ->cascadeOnDelete();
            $table->string('nama_komponen', 100);
            $table->decimal('bobot_persen', 5, 2);
            $table->unsignedInteger('urutan')->default(1);
            $table->timestamps();
        });

        Schema::create('nilai_detail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('komponen_id')
                ->constrained('komponen_nilai')
                ->cascadeOnDelete();
            $table->foreignId('anggota_kelas_id')
                ->constrained('anggota_kelas')
                ->cascadeOnDelete();
            $table->decimal('nilai_angka', 5, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users')
                ->nullOnDelete();
            $table->timestamps();

            $table->unique(['komponen_id', 'anggota_kelas_id']);
        });

        Schema::create('nilai_akhir_mapel', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengajaran_id')
                ->constrained('pengajaran')
                ->cascadeOnDelete();
            $table->foreignId('anggota_kelas_id')
                ->constrained('anggota_kelas')
                ->cascadeOnDelete();
            $table->decimal('nilai_akhir', 5, 2)->default(0.00);
            $table->string('predikat', 5);
            $table->string('keterangan_predikat', 100)->nullable();
            $table->boolean('is_tuntas')->default(false);
            $table->timestamp('calculated_at')->nullable();
            $table->timestamps();

            $table->unique(['pengajaran_id', 'anggota_kelas_id']);
            $table->index(['pengajaran_id', 'predikat']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nilai_akhir_mapel');
        Schema::dropIfExists('nilai_detail');
        Schema::dropIfExists('komponen_nilai');
        Schema::dropIfExists('pengajaran');
    }
};

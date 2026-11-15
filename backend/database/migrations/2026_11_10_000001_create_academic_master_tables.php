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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('role');
            }
            if (! Schema::hasColumn('users', 'last_login_at')) {
                $table->timestamp('last_login_at')->nullable()->after('is_active');
            }
        });

        Schema::create('periode_akademik', function (Blueprint $table) {
            $table->id();
            $table->string('tahun_ajaran', 20);
            $table->enum('semester', ['GANJIL', 'GENAP']);
            $table->string('nama_periode', 50);
            $table->date('tanggal_mulai');
            $table->date('tanggal_selesai');
            $table->boolean('is_active')->default(false)->index();
            $table->timestamps();
        });

        Schema::create('rentang_nilai', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')
                ->constrained('periode_akademik')
                ->cascadeOnDelete();
            $table->string('predikat', 5);
            $table->decimal('batas_bawah', 5, 2);
            $table->decimal('batas_atas', 5, 2);
            $table->string('keterangan', 100)->nullable();
            $table->timestamps();

            $table->unique(['periode_id', 'predikat']);
        });

        Schema::create('mata_pelajaran', function (Blueprint $table) {
            $table->id();
            $table->string('kode_mapel', 20)->unique();
            $table->string('nama_mapel', 100);
            $table->string('kelompok', 50)->default('Umum');
            $table->decimal('kkm_default', 5, 2)->default(75.00);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('guru', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')
                ->nullable()
                ->unique()
                ->constrained('users')
                ->nullOnDelete();
            $table->string('nip', 30)->unique()->nullable();
            $table->string('nama_lengkap', 150);
            $table->char('jenis_kelamin', 1);
            $table->string('no_telepon', 20)->nullable();
            $table->text('alamat')->nullable();
            $table->string('foto_url', 255)->nullable();
            $table->timestamps();
        });

        Schema::create('siswa', function (Blueprint $table) {
            $table->id();
            $table->string('nis', 20)->unique();
            $table->string('nisn', 20)->unique()->nullable();
            $table->string('nama_lengkap', 150);
            $table->char('jenis_kelamin', 1);
            $table->date('tanggal_lahir')->nullable();
            $table->string('email', 150)->nullable();
            $table->string('no_telepon', 20)->nullable();
            $table->enum('status', ['AKTIF', 'LULUS', 'PINDAH', 'NONAKTIF'])->default('AKTIF');
            $table->timestamps();
        });

        Schema::create('kelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('periode_id')
                ->constrained('periode_akademik')
                ->cascadeOnDelete();
            $table->foreignId('wali_kelas_id')
                ->nullable()
                ->constrained('guru')
                ->nullOnDelete();
            $table->string('kode_kelas', 20);
            $table->string('nama_kelas', 50);
            $table->string('tingkat', 10);
            $table->timestamps();

            $table->unique(['periode_id', 'kode_kelas']);
        });

        Schema::create('anggota_kelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kelas_id')
                ->constrained('kelas')
                ->cascadeOnDelete();
            $table->foreignId('siswa_id')
                ->constrained('siswa')
                ->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['kelas_id', 'siswa_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('anggota_kelas');
        Schema::dropIfExists('kelas');
        Schema::dropIfExists('siswa');
        Schema::dropIfExists('guru');
        Schema::dropIfExists('mata_pelajaran');
        Schema::dropIfExists('rentang_nilai');
        Schema::dropIfExists('periode_akademik');

        Schema::table('users', function (Blueprint $table) {
            $columns = array_filter(
                ['is_active', 'last_login_at'],
                fn (string $column) => Schema::hasColumn('users', $column)
            );
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};

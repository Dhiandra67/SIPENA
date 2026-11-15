<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('nilai_detail', function (Blueprint $table) {
            $table->json('nilai_entri')->nullable()->after('nilai_angka');
        });
    }

    public function down(): void
    {
        Schema::table('nilai_detail', function (Blueprint $table) {
            $table->dropColumn('nilai_entri');
        });
    }
};

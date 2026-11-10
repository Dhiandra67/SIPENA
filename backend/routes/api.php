<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GuruController;
use App\Http\Controllers\GuruPenilaianController;
use App\Http\Controllers\KelasController;
use App\Http\Controllers\MataPelajaranController;
use App\Http\Controllers\PengajaranController;
use App\Http\Controllers\PeriodeController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RentangNilaiController;
use App\Http\Controllers\SiswaController;
use App\Http\Middleware\AuthenticateApiToken;
use App\Http\Middleware\EnsureRole;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    try {
        DB::select('SELECT 1');
    } catch (QueryException $exception) {
        Log::error('Database health check failed.', ['exception' => $exception]);

        return response()->json([
            'status' => 'error',
            'database' => 'unavailable',
        ], 503);
    }

    return response()->json([
        'status' => 'ok',
        'database' => 'connected',
    ]);
});

Route::middleware('throttle:5,1')->post('/auth/login', [AuthController::class, 'login']);
Route::middleware('throttle:5,1')->post('/v1/auth/login', [AuthController::class, 'login']);

Route::middleware(AuthenticateApiToken::class)->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    Route::prefix('v1')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Profil Pengguna (Admin & Guru)
        Route::get('/profile', [ProfileController::class, 'show']);
        Route::put('/profile', [ProfileController::class, 'update']);

        // Endpoint Baca Master Data (Admin & Guru sesuai matriks RBAC)
        Route::get('/periode', [PeriodeController::class, 'index']);
        Route::get('/rentang-nilai', [RentangNilaiController::class, 'index']);
        Route::get('/mapel', [MataPelajaranController::class, 'index']);
        Route::get('/kelas', [KelasController::class, 'index']);
        Route::get('/siswa/export', [SiswaController::class, 'export']);
        Route::get('/siswa', [SiswaController::class, 'index']);
        Route::get('/siswa/{id}', [SiswaController::class, 'show'])->whereNumber('id');
        Route::get('/pengajaran', [PengajaranController::class, 'index']);

        // Modul Guru (RAPORKU) & Penilaian
        Route::get('/guru/dashboard', [GuruPenilaianController::class, 'dashboard']);
        Route::get('/pengajaran-saya', [GuruPenilaianController::class, 'pengajaranSaya']);
        Route::get('/pengajaran/{id}', [GuruPenilaianController::class, 'detailPengajaran'])->whereNumber('id');
        Route::get('/pengajaran/{id}/komponen', [GuruPenilaianController::class, 'getKomponen'])->whereNumber('id');
        Route::put('/pengajaran/{id}/komponen', [GuruPenilaianController::class, 'updateKomponen']);
        Route::get('/pengajaran/{id}/nilai', [GuruPenilaianController::class, 'getNilai'])->whereNumber('id');
        Route::put('/pengajaran/{id}/nilai', [GuruPenilaianController::class, 'updateNilai'])->whereNumber('id');
        Route::post('/pengajaran/{id}/nilai/import', [GuruPenilaianController::class, 'importNilai'])->whereNumber('id');
        Route::get('/pengajaran/{id}/statistik', [GuruPenilaianController::class, 'statistik'])->whereNumber('id');

        // Modul Khusus Admin Sekolah (ROLE_ADMIN)
        Route::middleware(EnsureRole::class.':admin')->group(function () {
            Route::get('/admin/overview', [PengajaranController::class, 'overview']);

            Route::post('/periode', [PeriodeController::class, 'store']);
            Route::put('/periode/{id}', [PeriodeController::class, 'update'])->whereNumber('id');
            Route::patch('/periode/{id}/activate', [PeriodeController::class, 'activate'])->whereNumber('id');
            Route::post('/periode/{id}/copy-from', [PeriodeController::class, 'copyFromPeriode'])->whereNumber('id');
            Route::delete('/periode/{id}', [PeriodeController::class, 'destroy'])->whereNumber('id');

            Route::post('/rentang-nilai', [RentangNilaiController::class, 'store']);
            Route::put('/rentang-nilai/{id}', [RentangNilaiController::class, 'update'])->whereNumber('id');
            Route::delete('/rentang-nilai/{id}', [RentangNilaiController::class, 'destroy'])->whereNumber('id');

            Route::post('/mapel', [MataPelajaranController::class, 'store']);
            Route::put('/mapel/{id}', [MataPelajaranController::class, 'update'])->whereNumber('id');
            Route::delete('/mapel/{id}', [MataPelajaranController::class, 'destroy'])->whereNumber('id');

            Route::post('/kelas', [KelasController::class, 'store']);
            Route::put('/kelas/{id}', [KelasController::class, 'update'])->whereNumber('id');
            Route::delete('/kelas/{id}', [KelasController::class, 'destroy'])->whereNumber('id');

            Route::get('/guru', [GuruController::class, 'index']);
            Route::get('/guru/{id}', [GuruController::class, 'show'])->whereNumber('id');
            Route::post('/guru', [GuruController::class, 'store']);
            Route::put('/guru/{id}', [GuruController::class, 'update'])->whereNumber('id');
            Route::post('/guru/{id}/reset-password', [GuruController::class, 'resetPassword'])->whereNumber('id');
            Route::delete('/guru/{id}', [GuruController::class, 'destroy'])->whereNumber('id');

            Route::post('/siswa/import', [SiswaController::class, 'import']);
            Route::post('/siswa', [SiswaController::class, 'store']);
            Route::put('/siswa/{id}', [SiswaController::class, 'update'])->whereNumber('id');
            Route::delete('/siswa/{id}', [SiswaController::class, 'destroy'])->whereNumber('id');

            Route::post('/pengajaran', [PengajaranController::class, 'store']);
            Route::put('/pengajaran/{id}', [PengajaranController::class, 'update'])->whereNumber('id');
            Route::patch('/pengajaran/{id}/toggle-lock', [PengajaranController::class, 'toggleLock'])->whereNumber('id');
            Route::delete('/pengajaran/{id}', [PengajaranController::class, 'destroy'])->whereNumber('id');
        });
    });
});

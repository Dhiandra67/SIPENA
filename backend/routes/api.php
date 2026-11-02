<?php

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

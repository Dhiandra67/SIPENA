<?php

use Illuminate\Support\Facades\Route;

Route::view('/', 'welcome');

Route::get('/health', function () {
    return response()->json(['status' => 'ok']);
});

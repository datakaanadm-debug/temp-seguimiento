<?php

use Illuminate\Support\Facades\Route;

/**
 * Este servicio es un API headless — la UI vive en Vercel (apps/web).
 * El root devuelve JSON con info mínima para que tools de monitoring no
 * crasheen al pingear "/" y los humanos sepan que llegaron al lugar
 * equivocado. El health check real vive en GET /api/v1/health.
 */
Route::get('/', function () {
    return response()->json([
        'name' => config('app.name'),
        'service' => 'api',
        'docs' => '/api/v1/health',
    ]);
});

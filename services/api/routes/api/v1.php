<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

/*
 * Entry point de rutas /api/v1. Carga los routes.php de cada módulo.
 *
 * El archivo bootstrap/app.php mapea este archivo con prefijo 'api/v1' y
 * el middleware group 'api' (stateful + security headers).
 */

// Health
Route::get('/health', fn () => response()->json(['ok' => true, 'time' => now()->toIso8601String()]))
    ->name('health');

// Presence (lightweight heartbeat-based, TTL 60s)
Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::post('/presence/heartbeat', [\App\Http\Controllers\PresenceController::class, 'heartbeat'])
        ->middleware('throttle:60,1')
        ->name('presence.heartbeat');
    Route::get('/presence', [\App\Http\Controllers\PresenceController::class, 'peers'])
        ->name('presence.peers');
});

// Módulos
require app_path('Modules/Identity/Http/routes.php');
require app_path('Modules/Organization/Http/routes.php');
require app_path('Modules/People/Http/routes.php');
require app_path('Modules/Tasks/Http/routes.php');
require app_path('Modules/Tracking/Http/routes.php');
require app_path('Modules/Notifications/Http/routes.php');
require app_path('Modules/Performance/Http/routes.php');
require app_path('Modules/Reports/Http/routes.php');
require app_path('Modules/AI/Http/routes.php');
require app_path('Modules/Mentorship/Http/routes.php');
require app_path('Modules/Onboarding/Http/routes.php');
require app_path('Modules/Okrs/Http/routes.php');
require app_path('Modules/Gamification/Http/routes.php');
require app_path('Modules/Calendar/Http/routes.php');
require app_path('Modules/Automation/Http/routes.php');
require app_path('Modules/Search/Http/routes.php');

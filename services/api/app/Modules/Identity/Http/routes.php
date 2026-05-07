<?php

declare(strict_types=1);

/*
 * Rutas del módulo Identity. Se incluyen desde routes/api/v1.php con prefijo /api/v1.
 *
 * Algunas rutas son "tenantless" (no requieren subdomain resuelto): registro de tenant,
 * aceptar invitación. El middleware ResolveTenant las permite pasar explícitamente.
 */

use App\Modules\Identity\Http\Controllers\AuthController;
use App\Modules\Identity\Http\Controllers\InvitationController;
use App\Modules\Identity\Http\Controllers\TenantController;
use Illuminate\Support\Facades\Route;

// ── Pre-auth / pre-tenant ──────────────────────────────────────────────
Route::post('/tenants/register', [TenantController::class, 'register'])
    ->middleware('throttle:3,1')                // 3/min/IP
    ->name('tenants.register');

Route::post('/invitations/accept', [InvitationController::class, 'accept'])
    ->middleware('throttle:10,1')
    ->name('invitations.accept');

// ── Auth flow (tenant ya resuelto por subdomain) ───────────────────────
Route::post('/auth/login', [AuthController::class, 'login'])
    ->middleware(['tenant'])
    ->name('auth.login');

Route::post('/auth/logout', [AuthController::class, 'logout'])
    ->middleware(['tenant', 'auth:sanctum'])
    ->name('auth.logout');

Route::get('/auth/me', [AuthController::class, 'me'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('auth.me');

Route::post('/auth/me/tour-complete', [AuthController::class, 'completeTour'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('auth.me.tour-complete');

Route::post('/auth/me/tour-reset', [AuthController::class, 'resetTour'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('auth.me.tour-reset');

// ── Tenant info ────────────────────────────────────────────────────────
Route::get('/tenant', [TenantController::class, 'show'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('tenant.show');

Route::put('/tenant', [TenantController::class, 'update'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('tenant.update');

Route::post('/tenant/logo', [TenantController::class, 'uploadLogo'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('tenant.logo.upload');

Route::delete('/tenant/logo', [TenantController::class, 'removeLogo'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('tenant.logo.remove');

// Endpoint público para servir el logo (es branding, no PII).
// Sin middleware tenant para que <img src> directo desde browser funcione.
Route::get('/tenants/{tenant}/logo', [TenantController::class, 'showLogo'])
    ->name('tenants.logo.show');

Route::get('/roles', [\App\Modules\Identity\Http\Controllers\RolesController::class, 'index'])
    ->middleware(['tenant', 'auth:sanctum', 'tenant.member'])
    ->name('roles.index');

// ── Invitations (authenticated) ────────────────────────────────────────
Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/invitations', [InvitationController::class, 'index'])->name('invitations.index');
    Route::post('/invitations', [InvitationController::class, 'store'])->name('invitations.store');
    Route::delete('/invitations/{invitation}', [InvitationController::class, 'destroy'])->name('invitations.destroy');
});

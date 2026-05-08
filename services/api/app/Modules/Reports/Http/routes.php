<?php

declare(strict_types=1);

use App\Modules\Reports\Http\Controllers\ReportRunController;
use App\Modules\Reports\Http\Controllers\ReportTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Templates
    Route::apiResource('report-templates', ReportTemplateController::class);

    // Report runs (generación async)
    Route::get('/reports', [ReportRunController::class, 'index'])->name('reports.index');
    // throttle:max,decayMinutes — Laravel usa userId si está autenticado,
    // sino IP. Subimos a 200/hora porque generar reportes durante onboarding
    // (probar plantillas, regenerar tras cambios) supera el budget viejo de 60.
    // Producción alta-carga puede bajarlo vía override en RouteServiceProvider.
    Route::post('/reports', [ReportRunController::class, 'store'])
        ->middleware('throttle:200,60')
        ->name('reports.store');
    Route::get('/reports/{reportRun}', [ReportRunController::class, 'show'])->name('reports.show');
    Route::get('/reports/{reportRun}/download', [ReportRunController::class, 'download'])
        ->name('reports.download');
});

// Stream del PDF: protegido por signed URL (sin tenant/auth middleware
// porque al abrir desde una pestaña nueva no van cookies ni headers).
// La URL firmada por el backend caduca en 15 min — equivalente al
// pre-signed S3/R2 de producción.
Route::middleware('signed')->group(function () {
    Route::get('/reports/{reportRun}/file', [ReportRunController::class, 'file'])
        ->name('reports.file');
});

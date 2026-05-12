<?php

declare(strict_types=1);

use App\Modules\Audit\Http\Controllers\AuditLogController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/audit-log', [AuditLogController::class, 'index'])->name('audit-log.index');
    Route::get('/audit-log/log-names', [AuditLogController::class, 'logNames'])->name('audit-log.log-names');
});

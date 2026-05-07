<?php

declare(strict_types=1);

use App\Modules\Automation\Http\Controllers\AutomationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/automation-templates', [AutomationController::class, 'templates'])->name('automation.templates');

    Route::get('/automation-rules', [AutomationController::class, 'index'])->name('automation.rules.index');
    Route::post('/automation-rules', [AutomationController::class, 'store'])->name('automation.rules.store');
    Route::put('/automation-rules/{id}', [AutomationController::class, 'update'])->name('automation.rules.update');
    Route::patch('/automation-rules/{id}/toggle', [AutomationController::class, 'toggle'])->name('automation.rules.toggle');
    Route::delete('/automation-rules/{id}', [AutomationController::class, 'destroy'])->name('automation.rules.destroy');
    Route::get('/automation-rules/{id}/runs', [AutomationController::class, 'runs'])->name('automation.rules.runs');
});

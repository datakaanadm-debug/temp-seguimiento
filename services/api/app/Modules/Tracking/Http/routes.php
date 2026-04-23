<?php

declare(strict_types=1);

use App\Modules\Tracking\Http\Controllers\BlockerController;
use App\Modules\Tracking\Http\Controllers\DailyReportController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Daily reports
    Route::get('/daily-reports', [DailyReportController::class, 'index'])->name('daily-reports.index');
    Route::get('/daily-reports/today', [DailyReportController::class, 'today'])->name('daily-reports.today');
    Route::put('/daily-reports', [DailyReportController::class, 'upsert'])->name('daily-reports.upsert');
    Route::get('/daily-reports/{dailyReport}', [DailyReportController::class, 'show'])->name('daily-reports.show');
    Route::post('/daily-reports/{dailyReport}/review', [DailyReportController::class, 'review'])
        ->name('daily-reports.review');

    // Blockers
    Route::get('/blockers', [BlockerController::class, 'index'])->name('blockers.index');
    Route::post('/blockers', [BlockerController::class, 'store'])->name('blockers.store');
    Route::get('/blockers/{blocker}', [BlockerController::class, 'show'])->name('blockers.show');
    Route::post('/blockers/{blocker}/resolve', [BlockerController::class, 'resolve'])
        ->name('blockers.resolve');
});

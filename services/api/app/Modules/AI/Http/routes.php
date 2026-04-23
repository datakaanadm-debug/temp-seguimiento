<?php

declare(strict_types=1);

use App\Modules\AI\Http\Controllers\InsightController;
use App\Modules\AI\Http\Controllers\SummaryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Summaries (bajo demanda)
    Route::get('/ai/summaries', [SummaryController::class, 'index'])
        ->name('ai.summaries.index');
    Route::post('/ai/summaries/daily-report', [SummaryController::class, 'summarizeDailyReport'])
        ->middleware('throttle:10,60')
        ->name('ai.summaries.daily-report');
    Route::post('/ai/summaries/evaluation-narrative', [SummaryController::class, 'evaluationNarrative'])
        ->middleware('throttle:10,60')
        ->name('ai.summaries.evaluation-narrative');
    Route::post('/ai/summaries/{aiSummary}/approve', [SummaryController::class, 'approve'])
        ->name('ai.summaries.approve');

    // Insights
    Route::get('/ai/insights', [InsightController::class, 'index'])
        ->name('ai.insights.index');
    Route::post('/ai/insights/detect', [InsightController::class, 'detect'])
        ->middleware('throttle:20,60')
        ->name('ai.insights.detect');
    Route::post('/ai/insights/{aiInsight}/acknowledge', [InsightController::class, 'acknowledge'])
        ->name('ai.insights.acknowledge');
    Route::post('/ai/insights/{aiInsight}/dismiss', [InsightController::class, 'dismiss'])
        ->name('ai.insights.dismiss');
    Route::post('/ai/insights/{aiInsight}/resolve', [InsightController::class, 'resolve'])
        ->name('ai.insights.resolve');
});

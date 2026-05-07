<?php

declare(strict_types=1);

use App\Modules\Analytics\Http\Controllers\ActivityHeatmapController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/analytics/activity-heatmap', ActivityHeatmapController::class)
        ->middleware('throttle:30,1')
        ->name('analytics.activity-heatmap');
});

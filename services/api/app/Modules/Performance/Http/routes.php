<?php

declare(strict_types=1);

use App\Modules\Performance\Http\Controllers\EvaluationController;
use App\Modules\Performance\Http\Controllers\ScorecardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Scorecards
    Route::apiResource('scorecards', ScorecardController::class);

    // Evaluations
    Route::get('/evaluations', [EvaluationController::class, 'index'])->name('evaluations.index');
    Route::post('/evaluations', [EvaluationController::class, 'store'])->name('evaluations.store');
    Route::get('/evaluations/{evaluation}', [EvaluationController::class, 'show'])->name('evaluations.show');
    Route::put('/evaluations/{evaluation}/responses', [EvaluationController::class, 'saveResponses'])
        ->name('evaluations.responses');
    Route::post('/evaluations/{evaluation}/submit', [EvaluationController::class, 'submit'])
        ->name('evaluations.submit');
    Route::post('/evaluations/{evaluation}/acknowledge', [EvaluationController::class, 'acknowledge'])
        ->name('evaluations.acknowledge');

    // Lifecycle adicional (M11 fase 2 — UI para gaps que estaban solo en dominio)
    Route::post('/evaluations/{evaluation}/dispute', [EvaluationController::class, 'dispute'])
        ->name('evaluations.dispute');
    Route::post('/evaluations/{evaluation}/resolve', [EvaluationController::class, 'resolve'])
        ->name('evaluations.resolve');
    Route::post('/evaluations/{evaluation}/cancel', [EvaluationController::class, 'cancel'])
        ->name('evaluations.cancel');
    Route::patch('/evaluations/{evaluation}/assign', [EvaluationController::class, 'assign'])
        ->name('evaluations.assign');
});

<?php

declare(strict_types=1);

use App\Modules\Onboarding\Http\Controllers\OnboardingController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/onboarding/checklist', [OnboardingController::class, 'checklist'])->name('onboarding.checklist');
    Route::post('/onboarding/items', [OnboardingController::class, 'store'])->name('onboarding.items.store');
    Route::post('/onboarding/items/{item}/toggle', [OnboardingController::class, 'toggle'])->name('onboarding.items.toggle');
    Route::delete('/onboarding/items/{item}', [OnboardingController::class, 'destroy'])->name('onboarding.items.destroy');
});

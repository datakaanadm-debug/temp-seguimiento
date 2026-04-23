<?php

declare(strict_types=1);

use App\Modules\Okrs\Http\Controllers\ObjectiveController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/objectives', [ObjectiveController::class, 'index'])->name('okrs.index');
    Route::post('/objectives', [ObjectiveController::class, 'store'])->name('okrs.store');
    Route::delete('/objectives/{id}', [ObjectiveController::class, 'destroy'])->name('okrs.destroy');
    Route::post('/key-results/{id}/check-in', [ObjectiveController::class, 'checkIn'])->name('okrs.checkin');
});

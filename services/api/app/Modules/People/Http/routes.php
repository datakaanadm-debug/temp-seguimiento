<?php

declare(strict_types=1);

use App\Modules\People\Http\Controllers\MentorAssignmentController;
use App\Modules\People\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Profiles
    Route::get('/profiles/me', [ProfileController::class, 'me'])->name('profiles.me');
    Route::get('/profiles', [ProfileController::class, 'index'])->name('profiles.index');
    Route::get('/profiles/{profile}', [ProfileController::class, 'show'])->name('profiles.show');
    Route::patch('/profiles/{profile}', [ProfileController::class, 'update'])->name('profiles.update');
    Route::put('/profiles/{profile}/intern-data', [ProfileController::class, 'upsertInternData'])
        ->name('profiles.intern-data.upsert');

    // Mentor assignments
    Route::get('/mentor-assignments', [MentorAssignmentController::class, 'index'])
        ->name('mentor-assignments.index');
    Route::post('/mentor-assignments', [MentorAssignmentController::class, 'store'])
        ->name('mentor-assignments.store');
    Route::delete('/mentor-assignments/{assignment}', [MentorAssignmentController::class, 'destroy'])
        ->name('mentor-assignments.destroy');
});

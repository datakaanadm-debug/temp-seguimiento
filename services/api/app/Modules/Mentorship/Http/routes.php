<?php

declare(strict_types=1);

use App\Modules\Mentorship\Http\Controllers\GrowthController;
use App\Modules\Mentorship\Http\Controllers\MentorNoteController;
use App\Modules\Mentorship\Http\Controllers\MentorSessionController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/mentor-sessions', [MentorSessionController::class, 'index'])->name('mentor.sessions.index');
    Route::post('/mentor-sessions', [MentorSessionController::class, 'store'])->name('mentor.sessions.store');
    Route::get('/mentor-sessions/{session}', [MentorSessionController::class, 'show'])->name('mentor.sessions.show');
    Route::put('/mentor-sessions/{session}', [MentorSessionController::class, 'update'])->name('mentor.sessions.update');
    Route::delete('/mentor-sessions/{session}', [MentorSessionController::class, 'destroy'])->name('mentor.sessions.destroy');

    Route::get('/mentor-notes', [MentorNoteController::class, 'index'])->name('mentor.notes.index');
    Route::post('/mentor-notes', [MentorNoteController::class, 'store'])->name('mentor.notes.store');
    Route::put('/mentor-notes/{note}', [MentorNoteController::class, 'update'])->name('mentor.notes.update');
    Route::delete('/mentor-notes/{note}', [MentorNoteController::class, 'destroy'])->name('mentor.notes.destroy');

    Route::get('/growth-paths/{internUserId}', [GrowthController::class, 'path'])->name('growth.path');
    Route::put('/growth-paths/{internUserId}/skills', [GrowthController::class, 'upsertSkill'])->name('growth.skills.upsert');
    Route::post('/growth-paths/{internUserId}/goals', [GrowthController::class, 'storeGoal'])->name('growth.goals.store');
    Route::post('/growth-goals/{goal}/toggle', [GrowthController::class, 'toggleGoal'])->name('growth.goals.toggle');
    Route::delete('/growth-goals/{goal}', [GrowthController::class, 'destroyGoal'])->name('growth.goals.destroy');
});

<?php

declare(strict_types=1);

use App\Modules\Gamification\Http\Controllers\GamificationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/badges', [GamificationController::class, 'badges'])->name('badges.index');
    Route::get('/user-badges', [GamificationController::class, 'myBadges'])->name('user-badges.index');
    Route::get('/leaderboard', [GamificationController::class, 'leaderboard'])->name('leaderboard');
    Route::get('/gamification/wall', [GamificationController::class, 'wall'])->name('gamification.wall');
    Route::get('/gamification/me', [GamificationController::class, 'myStats'])->name('gamification.me');
});

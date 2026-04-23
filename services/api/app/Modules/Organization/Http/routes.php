<?php

declare(strict_types=1);

use App\Modules\Organization\Http\Controllers\AreaController;
use App\Modules\Organization\Http\Controllers\DepartmentController;
use App\Modules\Organization\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Departments
    Route::apiResource('departments', DepartmentController::class);

    // Areas
    Route::apiResource('areas', AreaController::class)->except(['show']);

    // Teams
    Route::apiResource('teams', TeamController::class);
    Route::get('/teams/{team}/members', [TeamController::class, 'members'])
        ->name('teams.members.index');
    Route::post('/teams/{team}/members', [TeamController::class, 'addMember'])
        ->name('teams.members.store');
    Route::delete('/teams/{team}/members/{membership}', [TeamController::class, 'removeMember'])
        ->name('teams.members.destroy');
});

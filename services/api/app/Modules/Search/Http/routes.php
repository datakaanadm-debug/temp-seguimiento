<?php

declare(strict_types=1);

use App\Modules\Search\Http\Controllers\SearchController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/search', SearchController::class)
        ->middleware('throttle:30,1')
        ->name('search.global');
});

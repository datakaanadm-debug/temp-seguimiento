<?php

declare(strict_types=1);

use App\Modules\Calendar\Http\Controllers\CalendarController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/calendar/today', [CalendarController::class, 'today'])->name('calendar.today');
    Route::post('/calendar-events', [CalendarController::class, 'store'])->name('calendar-events.store');
    Route::delete('/calendar-events/{id}', [CalendarController::class, 'destroy'])->name('calendar-events.destroy');
});

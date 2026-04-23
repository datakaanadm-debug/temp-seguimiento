<?php

declare(strict_types=1);

use App\Modules\Notifications\Http\Controllers\NotificationController;
use App\Modules\Notifications\Http\Controllers\NotificationPreferenceController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // Notifications feed
    Route::get('/notifications', [NotificationController::class, 'index'])
        ->name('notifications.index');
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount'])
        ->name('notifications.unread-count');
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markRead'])
        ->name('notifications.read');
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead'])
        ->name('notifications.read-all');
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy'])
        ->name('notifications.destroy');

    // Preferences
    Route::get('/notification-preferences', [NotificationPreferenceController::class, 'index'])
        ->name('notification-preferences.index');
    Route::put('/notification-preferences', [NotificationPreferenceController::class, 'upsert'])
        ->name('notification-preferences.upsert');
});

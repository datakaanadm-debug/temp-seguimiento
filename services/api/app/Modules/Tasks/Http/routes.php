<?php

declare(strict_types=1);

use App\Modules\Tasks\Http\Controllers\AttachmentController;
use App\Modules\Tasks\Http\Controllers\CommentController;
use App\Modules\Tasks\Http\Controllers\ProjectController;
use App\Modules\Tasks\Http\Controllers\TagController;
use App\Modules\Tasks\Http\Controllers\TaskController;
use App\Modules\Tasks\Http\Controllers\TaskListController;
use App\Modules\Tasks\Http\Controllers\TimeEntryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    // ── Projects ─────────────────────────────────────────────────
    Route::apiResource('projects', ProjectController::class);

    // ── Task Lists (columnas Kanban) ─────────────────────────────
    Route::get('/projects/{project}/lists', [TaskListController::class, 'index'])
        ->name('projects.lists.index');
    Route::post('/projects/{project}/lists', [TaskListController::class, 'store'])
        ->name('projects.lists.store');
    Route::post('/projects/{project}/lists/reorder', [TaskListController::class, 'reorder'])
        ->name('projects.lists.reorder');
    Route::patch('/lists/{list}', [TaskListController::class, 'update'])
        ->name('lists.update');
    Route::delete('/lists/{list}', [TaskListController::class, 'destroy'])
        ->name('lists.destroy');

    // ── Tasks ────────────────────────────────────────────────────
    Route::get('/tasks', [TaskController::class, 'index'])->name('tasks.index');
    Route::post('/tasks', [TaskController::class, 'store'])->name('tasks.store');
    Route::get('/tasks/{task}', [TaskController::class, 'show'])->name('tasks.show');
    Route::patch('/tasks/{task}', [TaskController::class, 'update'])->name('tasks.update');
    Route::delete('/tasks/{task}', [TaskController::class, 'destroy'])->name('tasks.destroy');
    Route::post('/tasks/{task}/state', [TaskController::class, 'changeState'])->name('tasks.state');

    // ── Comments ─────────────────────────────────────────────────
    Route::get('/tasks/{task}/comments', [CommentController::class, 'index'])
        ->name('tasks.comments.index');
    Route::post('/tasks/{task}/comments', [CommentController::class, 'store'])
        ->name('tasks.comments.store');
    Route::patch('/comments/{comment}', [CommentController::class, 'update'])
        ->name('comments.update');
    Route::delete('/comments/{comment}', [CommentController::class, 'destroy'])
        ->name('comments.destroy');

    // ── Attachments ──────────────────────────────────────────────
    Route::get('/tasks/{task}/attachments', [AttachmentController::class, 'index'])
        ->name('tasks.attachments.index');
    Route::post('/tasks/{task}/attachments/presign', [AttachmentController::class, 'presign'])
        ->name('tasks.attachments.presign');
    Route::post('/tasks/{task}/attachments', [AttachmentController::class, 'store'])
        ->name('tasks.attachments.store');
    Route::delete('/attachments/{attachment}', [AttachmentController::class, 'destroy'])
        ->name('attachments.destroy');

    // ── Time tracking ────────────────────────────────────────────
    Route::get('/tasks/{task}/time-entries', [TimeEntryController::class, 'indexForTask'])
        ->name('tasks.time-entries.index');
    Route::post('/tasks/{task}/time-entries/start', [TimeEntryController::class, 'start'])
        ->name('tasks.time-entries.start');
    Route::post('/tasks/{task}/time-entries/manual', [TimeEntryController::class, 'manual'])
        ->name('tasks.time-entries.manual');
    Route::post('/time-entries/{entry}/stop', [TimeEntryController::class, 'stop'])
        ->name('time-entries.stop');
    Route::get('/time-entries/running', [TimeEntryController::class, 'running'])
        ->name('time-entries.running');

    // ── Tags ─────────────────────────────────────────────────────
    Route::get('/tags', [TagController::class, 'index'])->name('tags.index');
    Route::post('/tags', [TagController::class, 'store'])->name('tags.store');
    Route::delete('/tags/{tag}', [TagController::class, 'destroy'])->name('tags.destroy');
});

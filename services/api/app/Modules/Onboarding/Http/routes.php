<?php

declare(strict_types=1);

use App\Modules\Onboarding\Http\Controllers\OnboardingAttachmentController;
use App\Modules\Onboarding\Http\Controllers\OnboardingController;
use App\Modules\Onboarding\Http\Controllers\OnboardingTemplateController;
use Illuminate\Support\Facades\Route;

Route::middleware(['tenant', 'auth:sanctum', 'tenant.member'])->group(function () {
    Route::get('/onboarding/checklist', [OnboardingController::class, 'checklist'])->name('onboarding.checklist');
    Route::post('/onboarding/items', [OnboardingController::class, 'store'])->name('onboarding.items.store');
    Route::post('/onboarding/items/{item}/toggle', [OnboardingController::class, 'toggle'])->name('onboarding.items.toggle');
    Route::delete('/onboarding/items/{item}', [OnboardingController::class, 'destroy'])->name('onboarding.items.destroy');

    // Documentos subidos por el practicante (contrato, INE, NDA, etc)
    Route::get('/onboarding/items/{item}/attachments', [OnboardingAttachmentController::class, 'index'])
        ->name('onboarding.attachments.index');
    Route::post('/onboarding/items/{item}/attachments', [OnboardingAttachmentController::class, 'store'])
        ->name('onboarding.attachments.store');
    Route::delete('/onboarding/attachments/{attachment}', [OnboardingAttachmentController::class, 'destroy'])
        ->name('onboarding.attachments.destroy');
    Route::get('/onboarding/attachments/{attachment}/download', [OnboardingAttachmentController::class, 'download'])
        ->name('onboarding.attachments.download');

    // Template editable por tenant (admin/hr)
    Route::get('/onboarding/template', [OnboardingTemplateController::class, 'index'])
        ->name('onboarding.template.index');
    Route::post('/onboarding/template', [OnboardingTemplateController::class, 'store'])
        ->name('onboarding.template.store');
    Route::patch('/onboarding/template/{item}', [OnboardingTemplateController::class, 'update'])
        ->name('onboarding.template.update');
    Route::delete('/onboarding/template/{item}', [OnboardingTemplateController::class, 'destroy'])
        ->name('onboarding.template.destroy');
    Route::post('/onboarding/template/reset', [OnboardingTemplateController::class, 'reset'])
        ->name('onboarding.template.reset');
});

<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Gamificación — corre diario a las 03:00 UTC.
// Otorga `zero-blocks` a usuarios activos sin blockers en los últimos 30 días.
Schedule::command('gamify:award-zero-blocks')
    ->dailyAt('03:00')
    ->withoutOverlapping()
    ->onFailure(fn () => logger()->error('gamify:award-zero-blocks failed'));

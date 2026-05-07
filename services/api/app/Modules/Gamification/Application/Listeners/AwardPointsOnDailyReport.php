<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;

/**
 * Listener: cada vez que un practicante submite su bitácora del día.
 *
 *  · +20 puntos
 *  · sube streak (recordActivity)
 *  · si streak alcanza 7/30/90 → desbloquea punctual-7 / punctual-30 / streak-90
 *  · si no, actualiza el progreso visible de la siguiente badge
 */
final class AwardPointsOnDailyReport
{
    public function __construct(private GamificationService $g) {}

    public function handle(DailyReportSubmitted $event): void
    {
        $userId = $event->report->user_id;
        if (!$userId) return;

        // 1) Puntos por reportar
        $this->g->awardPoints($userId, 20);

        // 2) Actualiza racha
        $streak = $this->g->recordActivity($userId);

        // 3) Desbloqueos por hito de racha
        if ($streak >= 90) {
            $this->g->awardBadge($userId, 'streak-90');
        }
        if ($streak >= 30) {
            $this->g->awardBadge($userId, 'punctual-30');
        }
        if ($streak >= 7) {
            $this->g->awardBadge($userId, 'punctual-7');
        }

        // 4) Progreso visible de las que aún no llegan
        if ($streak < 7) {
            $this->g->updateProgress($userId, 'punctual-7', (int) round(($streak / 7) * 100));
        } elseif ($streak < 30) {
            $this->g->updateProgress($userId, 'punctual-30', (int) round(($streak / 30) * 100));
        } elseif ($streak < 90) {
            $this->g->updateProgress($userId, 'streak-90', (int) round(($streak / 90) * 100));
        }
    }
}

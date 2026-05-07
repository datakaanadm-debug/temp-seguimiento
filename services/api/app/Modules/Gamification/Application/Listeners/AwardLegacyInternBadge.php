<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\People\Domain\Events\InternHired;

/**
 * Listener: otorga `legacy-intern` (platino, +500 pts) cuando un practicante
 * es marcado como contratado.
 *
 * Idempotente: si ya tiene la badge, awardBadge no hace nada.
 */
final class AwardLegacyInternBadge
{
    public function __construct(private GamificationService $g) {}

    public function handle(InternHired $event): void
    {
        $userId = $event->profile->user_id;
        if (!$userId) return;

        $this->g->awardBadge($userId, 'legacy-intern');
    }
}

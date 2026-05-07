<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Onboarding\Domain\Events\OnboardingChecklistCompleted;

/**
 * Listener: cuando un practicante completa su checklist de onboarding al 100%.
 *
 *  · Otorga la badge `first-day` (bronze, 20 pts).
 *
 * Si por alguna razón se reabre y se vuelve a completar, awardBadge es idempotente.
 */
final class AwardBadgeOnOnboardingComplete
{
    public function __construct(private GamificationService $g) {}

    public function handle(OnboardingChecklistCompleted $event): void
    {
        $this->g->awardBadge($event->internUserId, 'first-day');
    }
}

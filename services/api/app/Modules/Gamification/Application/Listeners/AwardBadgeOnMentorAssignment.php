<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\People\Domain\Events\InternAssignedToMentor;

/**
 * Listener: cuando se asigna un practicante a un mentor.
 *
 *  · Otorga `mentor-cert` al mentor (idempotente, solo se da una vez).
 *
 * No diferencia "primera vez" vs "subsiguientes" porque awardBadge es
 * idempotente — si ya la tiene, no hace nada.
 */
final class AwardBadgeOnMentorAssignment
{
    public function __construct(private GamificationService $g) {}

    public function handle(InternAssignedToMentor $event): void
    {
        $mentorId = $event->assignment->mentor_user_id ?? null;
        if (!$mentorId) return;

        $this->g->awardBadge($mentorId, 'mentor-cert');
    }
}

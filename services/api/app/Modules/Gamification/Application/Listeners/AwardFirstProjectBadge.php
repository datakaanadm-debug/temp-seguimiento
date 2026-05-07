<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Tasks\Domain\Events\ProjectCompleted;

/**
 * Listener: cuando un proyecto pasa a `completed`, otorga `first-project`
 * (silver, +75 pts) al `created_by` del proyecto.
 *
 * Idempotente — si esa persona ya entregó otro proyecto antes y tiene
 * la badge, awardBadge no la duplica.
 *
 * Por qué `created_by`: el schema actual de `projects` no tiene `lead_id`
 * ni `owner_id`. El creador es el proxy razonable de "quien lideró".
 * Si el dominio crece para incluir lead explícito, cambiar aquí.
 */
final class AwardFirstProjectBadge
{
    public function __construct(private GamificationService $g) {}

    public function handle(ProjectCompleted $event): void
    {
        $userId = $event->project->created_by ?? null;
        if (!$userId) return;

        $this->g->awardBadge($userId, 'first-project');
    }
}

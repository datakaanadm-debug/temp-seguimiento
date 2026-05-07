<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Tasks\Domain\Events\TaskCommented;

/**
 * Listener: cuando alguien comenta en una tarea.
 *
 *  · +2 puntos al autor.
 *  · Cuenta hacia master-collab (50+ comentarios constructivos).
 *
 * Nota: no validamos "constructivo" — confiamos en que comentar tiene valor.
 * Filtros futuros (longitud mínima, no bot, etc.) van aquí.
 */
final class AwardCollabOnComment
{
    public function __construct(private GamificationService $g) {}

    public function handle(TaskCommented $event): void
    {
        $authorId = $event->author->id ?? null;
        if (!$authorId) return;

        $this->g->awardPoints($authorId, 2);

        $count = $this->g->incrementCounter($authorId, 'comments');
        if ($count >= 50) {
            $this->g->awardBadge($authorId, 'master-collab');
        } else {
            $this->g->updateProgress($authorId, 'master-collab', (int) round(($count / 50) * 100));
        }
    }
}

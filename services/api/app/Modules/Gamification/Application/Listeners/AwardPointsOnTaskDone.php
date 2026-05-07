<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Events\TaskStateChanged;

/**
 * Listener: cuando una tarea pasa a DONE (y no venía de DONE).
 *
 *  · +30 puntos al asignado (si lo hay).
 *  · Si la tarea tenía estimated_minutes y la completó por debajo de ese estimado,
 *    cuenta hacia speed-runner (10 tareas under-estimate desbloquea badge).
 */
final class AwardPointsOnTaskDone
{
    public function __construct(private GamificationService $g) {}

    public function handle(TaskStateChanged $event): void
    {
        if ($event->to !== TaskState::Done || $event->from === TaskState::Done) {
            return;
        }

        $assigneeId = $event->task->assignee_id;
        if (!$assigneeId) {
            return;
        }

        // 1) Puntos por completar tarea
        $this->g->awardPoints($assigneeId, 30);

        // 2) speed-runner: 10 tareas completadas por debajo del estimado
        $estimated = (int) ($event->task->estimated_minutes ?? 0);
        $actual = (int) ($event->task->actual_minutes ?? 0);
        if ($estimated > 0 && $actual > 0 && $actual < $estimated) {
            $count = $this->g->incrementCounter($assigneeId, 'speed_runs');
            if ($count >= 10) {
                $this->g->awardBadge($assigneeId, 'speed-runner');
            } else {
                $this->g->updateProgress($assigneeId, 'speed-runner', (int) round(($count / 10) * 100));
            }
        }
    }
}

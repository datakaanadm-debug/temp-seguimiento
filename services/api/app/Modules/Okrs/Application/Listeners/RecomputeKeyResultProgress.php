<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Okrs\Domain\KeyResult;
use App\Modules\Okrs\Domain\Objective;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Events\TaskStateChanged;
use App\Modules\Tasks\Domain\Task;
use Illuminate\Support\Facades\DB;

/**
 * Listener: cuando una task vinculada a un Key Result cambia de estado,
 * recalcula el `progress_percent` del KR como:
 *
 *     progress = round((tareas DONE / total tareas no canceladas) * 100)
 *
 * Si el progreso cruza 100, también marca el Objective como completed
 * cuando todos sus KRs estén al 100% — y dispara `okr-master` si el owner
 * cierra todos los objectives del trimestre.
 *
 * Nota: registramos un check-in automático con `author_id = NULL` para
 * que en el historial se vea de dónde vino el cambio (auto-derivado).
 */
final class RecomputeKeyResultProgress
{
    public function __construct(private GamificationService $gamification) {}

    public function handle(TaskStateChanged $event): void
    {
        $krId = $event->task->key_result_id ?? null;
        if (!$krId) return;

        // Solo nos interesan transiciones que afecten el conteo:
        // Done ↔ no-Done, o entrar/salir de Cancelled.
        if (
            $event->from === $event->to
            || (!$this->affectsCount($event->from) && !$this->affectsCount($event->to))
        ) {
            return;
        }

        $kr = KeyResult::find($krId);
        if (!$kr) return;

        // Tareas vinculadas a este KR, sin contar las canceladas (no representan trabajo)
        $rows = Task::where('key_result_id', $krId)
            ->whereNotIn('state', [TaskState::Cancelled->value])
            ->get(['state']);

        $total = $rows->count();
        if ($total === 0) return;

        $done = $rows->filter(fn ($t) => $t->state === TaskState::Done)->count();
        $newProgress = (int) round(($done / $total) * 100);

        $previousProgress = (int) $kr->progress_percent;
        if ($previousProgress === $newProgress) return;

        $actorId = $event->actor->id;

        DB::transaction(function () use ($kr, $previousProgress, $newProgress, $actorId) {
            // Check-in auto: el actor que cerró/abrió la tarea queda como autor.
            // El note distingue "Auto-derivado..." de los manuales.
            DB::table('okr_check_ins')->insert([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'tenant_id' => $kr->tenant_id,
                'key_result_id' => $kr->id,
                'author_id' => $actorId,
                'previous_progress' => $previousProgress,
                'new_progress' => $newProgress,
                'previous_confidence' => $kr->confidence,
                'new_confidence' => $kr->confidence,
                'note' => 'Auto-derivado desde tareas vinculadas',
                'created_at' => now(),
            ]);

            $kr->progress_percent = $newProgress;
            $kr->save();
        });

        // Si llegó a 100, intentar cerrar el objective y otorgar okr-master
        if ($previousProgress < 100 && $newProgress >= 100) {
            $this->onKeyResultCompleted($kr);
        }
    }

    private function affectsCount(TaskState $state): bool
    {
        return $state === TaskState::Done || $state === TaskState::Cancelled;
    }

    /**
     * Misma lógica que ObjectiveController::onKeyResultCompleted —
     * extraída acá para que el path "automático" la respete sin
     * duplicar el método. (Ideal: mover a un service compartido.)
     */
    private function onKeyResultCompleted(KeyResult $kr): void
    {
        $objective = Objective::find($kr->objective_id);
        if (!$objective) return;

        $allDone = !KeyResult::where('objective_id', $objective->id)
            ->where('progress_percent', '<', 100)
            ->exists();
        if (!$allDone) return;

        if ($objective->status !== 'completed') {
            $objective->status = 'completed';
            $objective->save();
        }

        if ($objective->owner_type !== 'user' || !$objective->owner_id) return;

        $totalQ = Objective::where('owner_type', 'user')
            ->where('owner_id', $objective->owner_id)
            ->where('quarter', $objective->quarter)
            ->count();
        if ($totalQ < 1) return;

        $doneQ = Objective::where('owner_type', 'user')
            ->where('owner_id', $objective->owner_id)
            ->where('quarter', $objective->quarter)
            ->where('status', 'completed')
            ->count();

        if ($doneQ === $totalQ) {
            $this->gamification->awardBadge($objective->owner_id, 'okr-master');
        } else {
            $this->gamification->updateProgress(
                $objective->owner_id,
                'okr-master',
                (int) round(($doneQ / max(1, $totalQ)) * 100),
            );
        }
    }
}

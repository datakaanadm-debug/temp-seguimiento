<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Services;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Enums\TaskState;
use App\Modules\Tasks\Domain\Exceptions\InvalidTaskTransition;
use App\Modules\Tasks\Domain\Task;

/**
 * Gestor del FSM de Task. Valida:
 *   1. La transición en sí misma (enum lo sabe).
 *   2. Reglas de autorización por rol (quién puede transicionar a qué).
 *   3. Constraints adicionales (auto-approval, razón en BLOCKED).
 *
 * No toca la DB; solo valida y (opcionalmente) muta el modelo en memoria.
 * El handler es quien persiste y emite evento.
 */
final class TaskStateMachine
{
    /**
     * Verifica que $user puede llevar $task de su estado actual a $to.
     * Lanza InvalidTaskTransition o AuthorizationException si no puede.
     */
    public function assertCanTransition(Task $task, TaskState $to, User $user, ?string $reason = null): void
    {
        $from = $task->state;

        if (!$from->canTransitionTo($to)) {
            throw InvalidTaskTransition::between($from, $to);
        }

        // BLOCKED exige razón
        if ($to === TaskState::Blocked && ($reason === null || trim($reason) === '')) {
            throw InvalidTaskTransition::blockedNeedsReason();
        }

        // DONE no la puede aprobar el mismo que la hizo (no self-approval)
        if ($to === TaskState::Done && $task->assignee_id === $user->id) {
            // Excepción: tenant_admin puede aprobar cualquier cosa
            if ($user->primaryRole() !== MembershipRole::TenantAdmin) {
                throw InvalidTaskTransition::selfApproval();
            }
        }

        // Proyecto archivado/pausado no admite cambios de estado
        if ($task->project && !$task->project->status->isWritable()) {
            throw InvalidTaskTransition::projectNotWritable();
        }

        $this->assertRoleCanTransitionTo($user, $from, $to, $task);
    }

    /**
     * Reglas por rol. Basadas en la matriz del doc de producto.
     */
    private function assertRoleCanTransitionTo(User $user, TaskState $from, TaskState $to, Task $task): void
    {
        $role = $user->primaryRole();

        // Admin/HR pueden cualquier transición válida
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return;
        }

        $allowed = match ($to) {
            // BACKLOG/TO_DO: líder o practicante al auto-gestionarse
            TaskState::Backlog, TaskState::ToDo => in_array($role, [
                MembershipRole::TeamLead, MembershipRole::Mentor, MembershipRole::Intern,
            ], true),

            // IN_PROGRESS: el asignado
            TaskState::InProgress => $task->assignee_id === $user->id
                || in_array($role, [MembershipRole::TeamLead, MembershipRole::Mentor], true),

            // IN_REVIEW: el asignado
            TaskState::InReview => $task->assignee_id === $user->id
                || in_array($role, [MembershipRole::TeamLead, MembershipRole::Mentor], true),

            // DONE: líder o mentor (ya validamos no self-approval arriba)
            TaskState::Done => in_array($role, [
                MembershipRole::TeamLead, MembershipRole::Mentor,
            ], true),

            // BLOCKED: cualquiera con acceso
            TaskState::Blocked => true,

            // CANCELLED: líder o admin
            TaskState::Cancelled => $role === MembershipRole::TeamLead,
        };

        if (!$allowed) {
            abort(403, "Role {$role?->value} cannot transition task to {$to->value}.");
        }
    }

    /**
     * Aplica la transición al modelo en memoria (no guarda).
     * Actualiza timestamps relevantes.
     */
    public function applyTransition(Task $task, TaskState $to, ?string $reason = null): void
    {
        $task->state = $to;

        if ($to === TaskState::InProgress && !$task->started_at) {
            $task->started_at = now();
        }
        if ($to === TaskState::Done) {
            $task->completed_at = now();
            $task->blocked_reason = null;
        }
        if ($to === TaskState::Cancelled) {
            $task->cancelled_at = now();
            $task->blocked_reason = null;
        }
        if ($to === TaskState::Blocked) {
            $task->blocked_reason = $reason;
        }
        // Si salimos de BLOCKED, limpiamos la razón
        if ($to !== TaskState::Blocked && $task->blocked_reason) {
            $task->blocked_reason = null;
        }
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Tenancy\TenantContext;

final class TaskPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Task $task): bool
    {
        if ($task->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        $role = $user->primaryRole();

        // Admin/HR ven todo
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }
        // Self-created / assignee / reviewer / watcher
        if ($task->created_by === $user->id
            || $task->assignee_id === $user->id
            || $task->reviewer_id === $user->id) {
            return true;
        }
        // Team lead del team del proyecto
        if ($role === MembershipRole::TeamLead
            && $task->project?->team?->lead_user_id === $user->id) {
            return true;
        }
        // Mentor: si es mentor del assignee
        if ($role === MembershipRole::Mentor && $task->assignee_id) {
            return \DB::table('mentor_assignments')
                ->where('tenant_id', TenantContext::currentId())
                ->where('mentor_user_id', $user->id)
                ->where('intern_user_id', $task->assignee_id)
                ->where('status', 'active')
                ->exists();
        }
        // Watcher en tabla pivote
        return \DB::table('task_assignees')
            ->where('task_id', $task->id)
            ->where('user_id', $user->id)
            ->exists();
    }

    public function create(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function update(User $user, Task $task): bool
    {
        if ($task->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        $role = $user->primaryRole();

        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR, MembershipRole::TeamLead], true)) {
            return true;
        }
        // Asignado puede editar campos cosméticos (title, description, due_at).
        // FSM sigue filtrando transiciones de estado aparte.
        return $task->assignee_id === $user->id;
    }

    public function changeState(User $user, Task $task): bool
    {
        // Cualquier rol con acceso a ver puede intentar cambiar estado;
        // TaskStateMachine es quien decide finalmente por rol + transición.
        return $this->view($user, $task);
    }

    public function delete(User $user, Task $task): bool
    {
        if ($task->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function comment(User $user, Task $task): bool
    {
        return $this->view($user, $task);
    }
}

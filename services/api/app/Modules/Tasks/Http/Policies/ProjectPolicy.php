<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Tasks\Domain\Project;
use App\Shared\Tenancy\TenantContext;

final class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Project $project): bool
    {
        if ($project->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        $role = $user->primaryRole();
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }
        // Team lead del team, o miembro del team, o asignado a alguna task del project
        return $this->userIsInTeam($user, $project->team_id);
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function update(User $user, Project $project): bool
    {
        if ($project->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        $role = $user->primaryRole();
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }
        // Team lead solo si es lead del team del proyecto
        return $role === MembershipRole::TeamLead
            && $project->team?->lead_user_id === $user->id;
    }

    public function delete(User $user, Project $project): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true) && $project->tenant_id === TenantContext::currentId();
    }

    private function userIsInTeam(User $user, string $teamId): bool
    {
        return $user->memberships()
            ->where('tenant_id', TenantContext::currentId())
            ->where('status', 'active')
            ->exists()
            && \DB::table('team_memberships')
                ->where('tenant_id', TenantContext::currentId())
                ->where('team_id', $teamId)
                ->where('user_id', $user->id)
                ->whereNull('left_at')
                ->exists();
    }
}

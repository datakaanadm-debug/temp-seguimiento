<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Team;
use App\Shared\Tenancy\TenantContext;

final class TeamPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Team $team): bool
    {
        return $team->tenant_id === TenantContext::currentId();
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function update(User $user, Team $team): bool
    {
        if ($team->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Admin, HR o el propio lead pueden actualizar
        return in_array($user->primaryRole(), [MembershipRole::TenantAdmin, MembershipRole::HR], true)
            || $team->lead_user_id === $user->id;
    }

    public function delete(User $user, Team $team): bool
    {
        return $user->primaryRole() === MembershipRole::TenantAdmin
            && $team->tenant_id === TenantContext::currentId();
    }

    public function manageMembers(User $user, Team $team): bool
    {
        if ($team->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true) || $team->lead_user_id === $user->id;
    }
}

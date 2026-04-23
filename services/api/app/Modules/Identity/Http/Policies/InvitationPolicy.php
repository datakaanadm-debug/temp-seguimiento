<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Policies;

use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;

final class InvitationPolicy
{
    public function viewAny(User $user): bool
    {
        $role = $user->primaryRole();
        return $role !== null && $role->canInvite();
    }

    public function view(User $user, Invitation $invitation): bool
    {
        return $invitation->tenant_id === TenantContext::currentId()
            && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return $user->primaryRole()?->canInvite() ?? false;
    }

    public function revoke(User $user, Invitation $invitation): bool
    {
        if ($invitation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // El que invitó o un admin/HR puede revocar
        $role = $user->primaryRole();
        return $invitation->invited_by === $user->id
            || in_array($role, [
                \App\Modules\Identity\Domain\Enums\MembershipRole::TenantAdmin,
                \App\Modules\Identity\Domain\Enums\MembershipRole::HR,
            ], true);
    }
}

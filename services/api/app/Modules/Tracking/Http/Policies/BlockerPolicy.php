<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Tracking\Domain\Blocker;
use App\Shared\Tenancy\TenantContext;

final class BlockerPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Blocker $blocker): bool
    {
        if ($blocker->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Raiser siempre ve
        if ($blocker->raised_by === $user->id) {
            return true;
        }
        // Staff ve todos
        return $user->primaryRole()?->isStaff() ?? false;
    }

    public function resolve(User $user, Blocker $blocker): bool
    {
        if ($blocker->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
            MembershipRole::Mentor,
        ], true);
    }
}

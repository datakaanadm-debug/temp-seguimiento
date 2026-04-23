<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Scorecard;
use App\Shared\Tenancy\TenantContext;

final class ScorecardPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Scorecard $scorecard): bool
    {
        return $scorecard->tenant_id === TenantContext::currentId();
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function update(User $user, Scorecard $scorecard): bool
    {
        return $this->create($user) && $scorecard->tenant_id === TenantContext::currentId();
    }

    public function delete(User $user, Scorecard $scorecard): bool
    {
        return $user->primaryRole() === MembershipRole::TenantAdmin
            && $scorecard->tenant_id === TenantContext::currentId();
    }
}

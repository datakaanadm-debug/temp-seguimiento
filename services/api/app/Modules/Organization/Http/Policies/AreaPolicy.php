<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Area;
use App\Shared\Tenancy\TenantContext;

final class AreaPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Area $area): bool
    {
        return $area->tenant_id === TenantContext::currentId();
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function update(User $user, Area $area): bool
    {
        return $this->create($user) && $area->tenant_id === TenantContext::currentId();
    }

    public function delete(User $user, Area $area): bool
    {
        return $user->primaryRole() === MembershipRole::TenantAdmin
            && $area->tenant_id === TenantContext::currentId();
    }
}

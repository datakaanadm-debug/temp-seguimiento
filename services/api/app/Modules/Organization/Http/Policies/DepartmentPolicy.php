<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Department;
use App\Shared\Tenancy\TenantContext;

final class DepartmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Department $department): bool
    {
        return $department->tenant_id === TenantContext::currentId()
            && $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function update(User $user, Department $department): bool
    {
        return $this->create($user) && $department->tenant_id === TenantContext::currentId();
    }

    public function delete(User $user, Department $department): bool
    {
        return $user->primaryRole() === MembershipRole::TenantAdmin
            && $department->tenant_id === TenantContext::currentId();
    }
}

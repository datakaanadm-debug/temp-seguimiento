<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Profile;
use App\Shared\Tenancy\TenantContext;

final class ProfilePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Profile $profile): bool
    {
        if ($profile->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Siempre puede ver su propio profile
        if ($profile->user_id === $user->id) {
            return true;
        }
        // Staff puede ver cualquier profile del tenant
        return $user->primaryRole()?->isStaff() ?? false;
    }

    public function update(User $user, Profile $profile): bool
    {
        if ($profile->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Self-update siempre permitido
        if ($profile->user_id === $user->id) {
            return true;
        }
        // Admin o HR pueden editar cualquier profile
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function updateSensitive(User $user, Profile $profile): bool
    {
        // Cambiar `kind` (rol funcional) requiere privilegio mayor
        if ($profile->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Audit\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;

/**
 * Solo Admin y Supervisor (rol read-only de control) pueden ver el log
 * completo del tenant. Mismo set que la capability `view_audit_log` del
 * frontend.
 */
final class ActivityLogPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::Supervisor,
        ], true);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Reports\Domain\ReportRun;
use App\Shared\Tenancy\TenantContext;

final class ReportRunPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, ReportRun $run): bool
    {
        if ($run->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Requester siempre ve
        if ($run->requested_by === $user->id) {
            return true;
        }
        // Subject (si es user) puede ver su propio reporte
        if ($run->subject_type === 'user' && $run->subject_id === $user->id) {
            return true;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function download(User $user, ReportRun $run): bool
    {
        return $this->view($user, $run);
    }
}

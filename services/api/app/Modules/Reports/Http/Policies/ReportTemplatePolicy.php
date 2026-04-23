<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Reports\Domain\ReportTemplate;
use App\Shared\Tenancy\TenantContext;

final class ReportTemplatePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, ReportTemplate $template): bool
    {
        return $template->tenant_id === TenantContext::currentId();
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    public function update(User $user, ReportTemplate $template): bool
    {
        if ($template->is_system) {
            return false; // system templates no se editan
        }
        return $this->create($user) && $template->tenant_id === TenantContext::currentId();
    }

    public function delete(User $user, ReportTemplate $template): bool
    {
        if ($template->is_system) {
            return false;
        }
        return $user->primaryRole() === MembershipRole::TenantAdmin
            && $template->tenant_id === TenantContext::currentId();
    }
}

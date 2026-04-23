<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Policies;

use App\Modules\AI\Domain\AiInsight;
use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;

final class AiInsightPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
            MembershipRole::Mentor,
        ], true);
    }

    public function view(User $user, AiInsight $insight): bool
    {
        if ($insight->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return $this->viewAny($user);
    }

    public function manage(User $user, AiInsight $insight): bool
    {
        return $this->view($user, $insight);
    }
}

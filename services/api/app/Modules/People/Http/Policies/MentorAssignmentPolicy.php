<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\MentorAssignment;
use App\Shared\Tenancy\TenantContext;

final class MentorAssignmentPolicy
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

    public function view(User $user, MentorAssignment $assignment): bool
    {
        if ($assignment->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return $assignment->mentor_user_id === $user->id
            || $assignment->intern_user_id === $user->id
            || $this->viewAny($user);
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function delete(User $user, MentorAssignment $assignment): bool
    {
        return $this->create($user) && $assignment->tenant_id === TenantContext::currentId();
    }
}

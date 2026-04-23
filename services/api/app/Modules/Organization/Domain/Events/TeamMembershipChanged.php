<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\TeamMembership;
use App\Shared\Events\DomainEvent;

final class TeamMembershipChanged extends DomainEvent
{
    public function __construct(
        public readonly TeamMembership $membership,
        public readonly string $action,   // 'added' | 'removed' | 'role_changed'
        public readonly ?User $actor,
    ) {
        parent::__construct();
    }
}

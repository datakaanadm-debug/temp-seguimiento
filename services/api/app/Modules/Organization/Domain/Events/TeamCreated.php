<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Team;
use App\Shared\Events\DomainEvent;

final class TeamCreated extends DomainEvent
{
    public function __construct(
        public readonly Team $team,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}

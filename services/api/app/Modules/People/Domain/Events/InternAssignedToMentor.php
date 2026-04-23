<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\MentorAssignment;
use App\Shared\Events\DomainEvent;

final class InternAssignedToMentor extends DomainEvent
{
    public function __construct(
        public readonly MentorAssignment $assignment,
        public readonly ?User $actor,
    ) {
        parent::__construct();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Organization\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Organization\Domain\Department;
use App\Shared\Events\DomainEvent;

final class DepartmentCreated extends DomainEvent
{
    public function __construct(
        public readonly Department $department,
        public readonly User $actor,
    ) {
        parent::__construct();
    }
}

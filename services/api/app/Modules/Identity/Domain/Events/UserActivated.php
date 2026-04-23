<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Events;

use App\Modules\Identity\Domain\Tenant;
use App\Modules\Identity\Domain\User;
use App\Shared\Events\DomainEvent;

final class UserActivated extends DomainEvent
{
    public function __construct(
        public readonly User $user,
        public readonly Tenant $tenant,
    ) {
        parent::__construct();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Events;

use App\Modules\Identity\Domain\Tenant;
use App\Modules\Identity\Domain\User;
use App\Shared\Events\DomainEvent;

final class TenantCreated extends DomainEvent
{
    public function __construct(
        public readonly Tenant $tenant,
        public readonly User $adminUser,
    ) {
        parent::__construct();
    }
}

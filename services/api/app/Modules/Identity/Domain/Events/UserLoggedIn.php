<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Shared\Events\DomainEvent;

final class UserLoggedIn extends DomainEvent
{
    public function __construct(
        public readonly User $user,
        public readonly ?string $tenantId,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
    ) {
        parent::__construct();
    }
}

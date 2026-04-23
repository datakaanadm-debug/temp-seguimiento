<?php

declare(strict_types=1);

namespace App\Modules\People\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Profile;
use App\Shared\Events\DomainEvent;

final class ProfileUpdated extends DomainEvent
{
    public function __construct(
        public readonly Profile $profile,
        public readonly User $actor,
        public readonly array $changes,
    ) {
        parent::__construct();
    }
}

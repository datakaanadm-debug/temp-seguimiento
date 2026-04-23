<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tracking\Domain\Blocker;
use App\Shared\Events\DomainEvent;

final class BlockerResolved extends DomainEvent
{
    public function __construct(
        public readonly Blocker $blocker,
        public readonly User $resolver,
    ) {
        parent::__construct();
    }
}

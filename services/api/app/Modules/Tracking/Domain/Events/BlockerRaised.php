<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Events;

use App\Modules\Tracking\Domain\Blocker;
use App\Shared\Events\DomainEvent;

final class BlockerRaised extends DomainEvent
{
    public function __construct(
        public readonly Blocker $blocker,
    ) {
        parent::__construct();
    }
}

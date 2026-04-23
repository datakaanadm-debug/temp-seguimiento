<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain\Events;

use App\Modules\Tasks\Domain\TimeEntry;
use App\Shared\Events\DomainEvent;

final class TimeEntryStopped extends DomainEvent
{
    public function __construct(
        public readonly TimeEntry $entry,
    ) {
        parent::__construct();
    }
}

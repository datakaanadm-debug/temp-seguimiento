<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain\Events;

use App\Modules\Reports\Domain\ReportRun;
use App\Shared\Events\DomainEvent;

final class ReportGenerated extends DomainEvent
{
    public function __construct(
        public readonly ReportRun $run,
    ) {
        parent::__construct();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Events;

use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Events\DomainEvent;

final class DailyReportSubmitted extends DomainEvent
{
    public function __construct(
        public readonly DailyReport $report,
    ) {
        parent::__construct();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Events\DomainEvent;

final class DailyReportReviewed extends DomainEvent
{
    public function __construct(
        public readonly DailyReport $report,
        public readonly User $reviewer,
    ) {
        parent::__construct();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Commands;

final readonly class SummarizeDailyReport
{
    public function __construct(
        public string $dailyReportId,
    ) {}
}

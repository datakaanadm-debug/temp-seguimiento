<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class UpsertDailyReport
{
    public function __construct(
        public User $user,
        public string $reportDate,        // YYYY-MM-DD
        public string $progressSummary,
        public bool $submit = true,
        public ?string $blockersText = null,
        public ?string $planTomorrow = null,
        public ?string $mood = null,
        public ?float $hoursWorked = null,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class ReviewDailyReport
{
    public function __construct(
        public string $reportId,
        public User $reviewer,
    ) {}
}

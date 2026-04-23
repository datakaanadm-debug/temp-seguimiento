<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class RaiseBlocker
{
    public function __construct(
        public User $raiser,
        public string $title,
        public string $severity = 'medium',
        public ?string $description = null,
        public ?string $relatedTaskId = null,
        public ?string $dailyReportId = null,
    ) {}
}

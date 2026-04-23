<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class StopTimer
{
    public function __construct(
        public string $timeEntryId,
        public User $user,
        public ?string $note = null,
    ) {}
}

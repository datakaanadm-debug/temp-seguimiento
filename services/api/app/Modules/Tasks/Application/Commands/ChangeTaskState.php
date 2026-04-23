<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class ChangeTaskState
{
    public function __construct(
        public string $taskId,
        public string $targetState,
        public User $actor,
        public ?string $reason = null,
    ) {}
}

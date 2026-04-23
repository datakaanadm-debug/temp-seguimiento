<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class StartTimer
{
    public function __construct(
        public string $taskId,
        public User $user,
        public ?string $note = null,
    ) {}
}

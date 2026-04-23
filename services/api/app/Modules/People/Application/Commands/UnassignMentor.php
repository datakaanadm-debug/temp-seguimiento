<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class UnassignMentor
{
    public function __construct(
        public string $assignmentId,
        public ?User $actor = null,
    ) {}
}

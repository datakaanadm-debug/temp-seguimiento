<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class AssignMentor
{
    public function __construct(
        public string $internUserId,
        public string $mentorUserId,
        public ?User $actor = null,
        public ?string $notes = null,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class InviteUser
{
    public function __construct(
        public string $email,
        public string $role,
        public User $actor,
        public ?string $teamId = null,
        public ?string $mentorId = null,
        public int $expiresInHours = 72,
    ) {}
}

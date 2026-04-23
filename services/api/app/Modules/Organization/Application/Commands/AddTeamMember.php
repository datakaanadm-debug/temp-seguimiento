<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class AddTeamMember
{
    public function __construct(
        public string $teamId,
        public string $userId,
        public string $role,
        public ?User $actor = null,
    ) {}
}

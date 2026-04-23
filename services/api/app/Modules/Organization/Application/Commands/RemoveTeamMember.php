<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class RemoveTeamMember
{
    public function __construct(
        public string $membershipId,
        public ?User $actor = null,
    ) {}
}

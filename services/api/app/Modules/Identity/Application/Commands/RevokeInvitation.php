<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class RevokeInvitation
{
    public function __construct(
        public string $invitationId,
        public User $actor,
    ) {}
}

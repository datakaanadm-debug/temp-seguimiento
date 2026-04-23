<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CreateTeam
{
    public function __construct(
        public string $areaId,
        public string $name,
        public string $slug,
        public User $actor,
        public ?string $leadUserId = null,
        public ?string $color = null,
        public array $metadata = [],
    ) {}
}

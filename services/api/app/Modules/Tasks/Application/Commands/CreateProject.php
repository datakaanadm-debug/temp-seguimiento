<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CreateProject
{
    public function __construct(
        public string $teamId,
        public string $name,
        public string $slug,
        public User $actor,
        public ?string $description = null,
        public ?string $color = null,
        public ?string $startDate = null,
        public ?string $endDate = null,
        public bool $withDefaultLists = true,
    ) {}
}

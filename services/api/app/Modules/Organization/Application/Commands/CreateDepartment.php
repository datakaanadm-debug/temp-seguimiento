<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CreateDepartment
{
    public function __construct(
        public string $name,
        public string $slug,
        public User $actor,
        public int $position = 0,
        public array $metadata = [],
    ) {}
}

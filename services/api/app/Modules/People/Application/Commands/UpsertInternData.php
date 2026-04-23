<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class UpsertInternData
{
    public function __construct(
        public string $profileId,
        public User $actor,
        public array $fields,
    ) {}
}

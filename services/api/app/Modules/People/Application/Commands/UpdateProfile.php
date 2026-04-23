<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class UpdateProfile
{
    public function __construct(
        public string $profileId,
        public User $actor,
        public array $fields,   // subset de campos a actualizar
    ) {}
}

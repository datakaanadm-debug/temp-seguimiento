<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

final readonly class AcceptInvitation
{
    public function __construct(
        public string $plainToken,
        public string $email,
        public string $name,
        public string $password,
        public ?string $timezone = null,
        public ?string $locale = null,
    ) {}
}

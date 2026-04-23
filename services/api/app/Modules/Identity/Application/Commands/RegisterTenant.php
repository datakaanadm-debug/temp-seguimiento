<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

final readonly class RegisterTenant
{
    public function __construct(
        public string $slug,
        public string $name,
        public string $adminEmail,
        public string $adminName,
        public string $adminPassword,
        public string $plan = 'starter',
        public string $dataResidency = 'latam',
    ) {}
}

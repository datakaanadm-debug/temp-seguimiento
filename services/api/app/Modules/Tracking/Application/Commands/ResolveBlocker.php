<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class ResolveBlocker
{
    public function __construct(
        public string $blockerId,
        public User $resolver,
        public string $resolution,
        public bool $dismiss = false,
    ) {}
}

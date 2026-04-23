<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class UpsertPreferences
{
    /**
     * @param list<array{channel: string, category: string, enabled?: bool, frequency?: string, quiet_hours?: array}> $preferences
     */
    public function __construct(
        public User $user,
        public array $preferences,
    ) {}
}

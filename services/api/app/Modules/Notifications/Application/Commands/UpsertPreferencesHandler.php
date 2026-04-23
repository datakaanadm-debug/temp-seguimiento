<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Application\Commands;

use App\Modules\Notifications\Domain\NotificationPreference;
use Illuminate\Support\Facades\DB;

final class UpsertPreferencesHandler
{
    public function handle(UpsertPreferences $command): void
    {
        DB::transaction(function () use ($command) {
            foreach ($command->preferences as $row) {
                NotificationPreference::query()->updateOrCreate(
                    [
                        'user_id' => $command->user->id,
                        'channel' => $row['channel'],
                        'category' => $row['category'],
                    ],
                    [
                        'enabled' => $row['enabled'] ?? true,
                        'frequency' => $row['frequency'] ?? 'immediate',
                        'quiet_hours' => $row['quiet_hours'] ?? null,
                    ]
                );
            }
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Application\Services;

use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Notifications\Domain\Enums\NotificationChannel;
use App\Modules\Notifications\Domain\Enums\NotificationFrequency;
use App\Modules\Notifications\Domain\NotificationPreference;

/**
 * Dado un user + category, decide a qué channels enviar.
 *
 * Defaults si no hay preferencias registradas:
 *   - In-app: true (siempre)
 *   - Email: true
 *   - Push: false (fase 2)
 *   - Frequency: immediate
 *
 * @see docs/architecture/05-events.md
 */
final class PreferenceMatrix
{
    private const DEFAULT_CHANNELS = [
        NotificationChannel::InApp,
        NotificationChannel::Email,
    ];

    /**
     * @return list<NotificationChannel>
     */
    public function channelsFor(string $userId, NotificationCategory $category, ?\DateTimeInterface $now = null): array
    {
        $now = $now ?? new \DateTimeImmutable();

        $prefs = NotificationPreference::query()
            ->where('user_id', $userId)
            ->where('category', $category->value)
            ->get()
            ->keyBy(fn ($p) => $p->channel->value);

        if ($prefs->isEmpty()) {
            // Sin preferencias: aplicar defaults
            return self::DEFAULT_CHANNELS;
        }

        $channels = [];
        foreach (NotificationChannel::cases() as $channel) {
            /** @var ?NotificationPreference $pref */
            $pref = $prefs->get($channel->value);

            if (!$pref) {
                if (in_array($channel, self::DEFAULT_CHANNELS, true)) {
                    $channels[] = $channel;
                }
                continue;
            }

            if (!$pref->enabled) {
                continue;
            }
            if ($pref->frequency === NotificationFrequency::Never) {
                continue;
            }
            // Immediate es el único soportado en MVP; hourly/daily van a cron batch (fase 2).
            if ($pref->frequency !== NotificationFrequency::Immediate) {
                continue;
            }
            if ($pref->isWithinQuietHours($now) && $channel !== NotificationChannel::InApp) {
                // In-app siempre pasa; email/push respetan quiet hours
                continue;
            }
            $channels[] = $channel;
        }
        return $channels;
    }
}

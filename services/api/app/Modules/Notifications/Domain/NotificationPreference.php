<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Notifications\Domain\Enums\NotificationChannel;
use App\Modules\Notifications\Domain\Enums\NotificationFrequency;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $user_id
 * @property NotificationChannel $channel
 * @property NotificationCategory $category
 * @property bool $enabled
 * @property NotificationFrequency $frequency
 * @property ?array $quiet_hours
 */
class NotificationPreference extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'notification_preferences';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'channel',
        'category',
        'enabled',
        'frequency',
        'quiet_hours',
    ];

    protected $casts = [
        'channel' => NotificationChannel::class,
        'category' => NotificationCategory::class,
        'frequency' => NotificationFrequency::class,
        'enabled' => 'boolean',
        'quiet_hours' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isWithinQuietHours(\DateTimeInterface $when): bool
    {
        $hours = $this->quiet_hours;
        if (!is_array($hours) || !isset($hours['start'], $hours['end'])) {
            return false;
        }
        $now = (int) $when->format('Hi');
        $start = (int) str_replace(':', '', $hours['start']);
        $end = (int) str_replace(':', '', $hours['end']);

        // Rango que cruza medianoche (22:00 → 08:00)
        if ($start > $end) {
            return $now >= $start || $now <= $end;
        }
        return $now >= $start && $now <= $end;
    }
}

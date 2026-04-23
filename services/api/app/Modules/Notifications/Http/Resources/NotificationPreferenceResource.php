<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Notifications\Domain\NotificationPreference
 */
final class NotificationPreferenceResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'channel' => $this->channel->value,
            'category' => $this->category->value,
            'enabled' => (bool) $this->enabled,
            'frequency' => $this->frequency->value,
            'quiet_hours' => $this->quiet_hours,
        ];
    }
}

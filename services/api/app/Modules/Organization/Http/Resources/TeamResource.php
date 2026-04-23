<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Organization\Domain\Team
 */
final class TeamResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'area_id' => $this->area_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'color' => $this->color,
            'lead' => $this->whenLoaded('lead', fn () => [
                'id' => $this->lead?->id,
                'name' => $this->lead?->name,
                'email' => $this->lead?->email,
                'avatar_url' => $this->lead?->avatar_url,
            ]),
            'member_count' => $this->whenCounted('memberships'),
            'metadata' => $this->metadata,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

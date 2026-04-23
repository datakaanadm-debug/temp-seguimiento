<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Organization\Domain\TeamMembership
 */
final class TeamMembershipResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'team_id' => $this->team_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'avatar_url' => $this->user->avatar_url,
            ]),
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'joined_at' => $this->joined_at?->toIso8601String(),
            'left_at' => $this->left_at?->toIso8601String(),
            'is_active' => $this->isActive(),
        ];
    }
}

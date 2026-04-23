<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Identity\Domain\Invitation
 */
final class InvitationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'email' => $this->email,
            'role' => $this->role->value,
            'role_label' => $this->role->label(),
            'team_id' => $this->team_id,
            'mentor_id' => $this->mentor_id,
            'expires_at' => $this->expires_at->toIso8601String(),
            'accepted_at' => $this->accepted_at?->toIso8601String(),
            'revoked_at' => $this->revoked_at?->toIso8601String(),
            'status' => $this->resolveStatus(),
            'invited_by' => [
                'id' => $this->invited_by,
                'name' => $this->whenLoaded('invitedBy', fn () => $this->invitedBy?->name),
            ],
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }

    private function resolveStatus(): string
    {
        if ($this->accepted_at) return 'accepted';
        if ($this->revoked_at) return 'revoked';
        if ($this->expires_at->isPast()) return 'expired';
        return 'pending';
    }
}

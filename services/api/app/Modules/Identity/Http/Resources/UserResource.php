<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Identity\Domain\User
 */
final class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $membership = $this->currentMembership();

        return [
            'id' => $this->id,
            'email' => $this->email,
            'name' => $this->name,
            'avatar_url' => $this->avatar_url,
            'locale' => $this->locale,
            'timezone' => $this->timezone,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'two_factor_enabled' => $this->two_factor_confirmed_at !== null,
            'role' => $membership?->role->value,
            'role_label' => $membership?->role->label(),
            'membership_status' => $membership?->status->value,
            'last_login_at' => $this->last_login_at?->toIso8601String(),
        ];
    }
}

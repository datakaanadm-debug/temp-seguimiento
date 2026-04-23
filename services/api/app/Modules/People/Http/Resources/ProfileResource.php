<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\People\Domain\Profile
 */
final class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actor = $request->user();
        $isSelf = $actor?->id === $this->user_id;
        $isStaff = $actor?->primaryRole()?->isStaff() ?? false;

        $base = [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'bio' => $this->bio,
            'position_title' => $this->position_title,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'skills' => $this->skills ?? [],
            'social_links' => $this->social_links ?? new \stdClass(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'avatar_url' => $this->user->avatar_url,
            ]),
            'intern_data' => InternDataResource::make($this->whenLoaded('internData')),
            'mentor_data' => MentorDataResource::make($this->whenLoaded('mentorData')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];

        // PII visible solo para el mismo user o para staff
        if ($isSelf || $isStaff) {
            $base['phone'] = $this->phone;
            $base['birth_date'] = $this->birth_date?->toDateString();
            $base['emergency_contact'] = $this->emergency_contact ?? new \stdClass();
        }

        // national_id solo visible al propio user o admin/HR
        if ($isSelf || in_array($actor?->primaryRole()?->value, ['tenant_admin', 'hr'], true)) {
            $base['national_id'] = $this->national_id;
        }

        return $base;
    }
}

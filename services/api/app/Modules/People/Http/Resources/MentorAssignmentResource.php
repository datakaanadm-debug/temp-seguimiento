<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\People\Domain\MentorAssignment
 */
final class MentorAssignmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mentor' => $this->whenLoaded('mentor', fn () => [
                'id' => $this->mentor->id,
                'name' => $this->mentor->name,
                'email' => $this->mentor->email,
                'avatar_url' => $this->mentor->avatar_url,
            ]),
            'intern' => $this->whenLoaded('intern', fn () => [
                'id' => $this->intern->id,
                'name' => $this->intern->name,
                'email' => $this->intern->email,
                'avatar_url' => $this->intern->avatar_url,
            ]),
            'status' => $this->status->value,
            'started_at' => $this->started_at->toIso8601String(),
            'ended_at' => $this->ended_at?->toIso8601String(),
            'notes' => $this->notes,
        ];
    }
}

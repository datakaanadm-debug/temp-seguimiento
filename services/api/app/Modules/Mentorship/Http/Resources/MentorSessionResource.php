<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MentorSessionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'mentor_user_id' => $this->mentor_user_id,
            'intern_user_id' => $this->intern_user_id,
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
            'scheduled_at' => $this->scheduled_at?->toIso8601String(),
            'duration_minutes' => $this->duration_minutes,
            'topic' => $this->topic,
            'agenda' => $this->agenda ?? [],
            'location' => $this->location,
            'status' => $this->status,
            'status_label' => match ($this->status) {
                'scheduled' => 'Programada',
                'in_progress' => 'En curso',
                'completed' => 'Completada',
                'cancelled' => 'Cancelada',
                'no_show' => 'No asistió',
                default => $this->status,
            },
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'tags' => $this->tags ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}

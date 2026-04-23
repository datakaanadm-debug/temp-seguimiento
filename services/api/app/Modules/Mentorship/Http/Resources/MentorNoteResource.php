<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MentorNoteResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'session_id' => $this->session_id,
            'intern_user_id' => $this->intern_user_id,
            'author_id' => $this->author_id,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'email' => $this->author->email,
            ]),
            'visibility' => $this->visibility,
            'body' => $this->body,
            'tags' => $this->tags ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}

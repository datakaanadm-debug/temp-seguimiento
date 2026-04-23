<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tasks\Domain\Comment
 */
final class CommentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'body' => $this->body,
            'mentions' => $this->mentions ?? [],
            'parent_comment_id' => $this->parent_comment_id,
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'email' => $this->author->email,
                'avatar_url' => $this->author->avatar_url,
            ]),
            'edited_at' => $this->edited_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Organization\Domain\Department
 */
final class DepartmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'position' => $this->position,
            'metadata' => $this->metadata,
            'areas' => AreaResource::collection($this->whenLoaded('areas')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

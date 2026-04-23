<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Organization\Domain\Area
 */
final class AreaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'department_id' => $this->department_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'position' => $this->position,
            'teams' => TeamResource::collection($this->whenLoaded('teams')),
        ];
    }
}

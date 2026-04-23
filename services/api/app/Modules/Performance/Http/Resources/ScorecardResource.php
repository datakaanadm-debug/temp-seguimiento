<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Performance\Domain\Scorecard
 */
final class ScorecardResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'applicable_to' => $this->applicable_to,
            'is_active' => (bool) $this->is_active,
            'metrics' => ScorecardMetricResource::collection($this->whenLoaded('metrics')),
            'metric_count' => $this->whenCounted('metrics'),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

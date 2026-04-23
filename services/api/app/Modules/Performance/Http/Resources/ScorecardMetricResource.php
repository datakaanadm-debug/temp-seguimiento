<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Performance\Domain\ScorecardMetric
 */
final class ScorecardMetricResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'label' => $this->label,
            'type' => $this->type->value,
            'source' => $this->source,
            'target_value' => $this->target_value ? (float) $this->target_value : null,
            'unit' => $this->unit,
            'weight' => (float) $this->weight,
            'config' => $this->config ?? new \stdClass(),
            'position' => $this->position,
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Performance\Domain\EvaluationResponse
 */
final class EvaluationResponseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'metric_id' => $this->metric_id,
            'value_numeric' => $this->value_numeric ? (float) $this->value_numeric : null,
            'value_text' => $this->value_text,
            'value_json' => $this->value_json,
            'auto_value' => $this->auto_value ? (float) $this->auto_value : null,
            'metric' => ScorecardMetricResource::make($this->whenLoaded('metric')),
        ];
    }
}

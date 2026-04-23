<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\AI\Domain\AiInsight
 */
final class AiInsightResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'severity' => $this->severity->value,
            'severity_weight' => $this->severity->weight(),
            'title' => $this->title,
            'description' => $this->description,
            'evidence' => $this->evidence,
            'confidence' => $this->confidence ? (float) $this->confidence : null,
            'dismissed_at' => $this->dismissed_at?->toIso8601String(),
            'acknowledged_at' => $this->acknowledged_at?->toIso8601String(),
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'is_active' => $this->isActive(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

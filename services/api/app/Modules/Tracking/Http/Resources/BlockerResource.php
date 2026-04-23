<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tracking\Domain\Blocker
 */
final class BlockerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'severity' => $this->severity->value,
            'severity_weight' => $this->severity->weight(),
            'status' => $this->status->value,
            'is_active' => $this->status->isActive(),
            'related_task_id' => $this->related_task_id,
            'daily_report_id' => $this->daily_report_id,
            'raised_by' => $this->raised_by,
            'raiser' => $this->whenLoaded('raiser', fn () => [
                'id' => $this->raiser->id,
                'name' => $this->raiser->name,
                'avatar_url' => $this->raiser->avatar_url,
            ]),
            'resolution' => $this->resolution,
            'resolved_by' => $this->resolved_by,
            'resolved_at' => $this->resolved_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

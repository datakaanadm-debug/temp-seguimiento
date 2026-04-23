<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tracking\Domain\DailyReport
 */
final class DailyReportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar_url' => $this->user->avatar_url,
            ]),
            'report_date' => $this->report_date->toDateString(),
            'status' => $this->status->value,
            'progress_summary' => $this->progress_summary,
            'blockers_text' => $this->blockers_text,
            'plan_tomorrow' => $this->plan_tomorrow,
            'mood' => $this->mood?->value,
            'hours_worked' => $this->hours_worked ? (float) $this->hours_worked : null,
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'reviewed_by' => $this->reviewed_by,
            'ai_summary_id' => $this->ai_summary_id,
            'blockers' => BlockerResource::collection($this->whenLoaded('blockers')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

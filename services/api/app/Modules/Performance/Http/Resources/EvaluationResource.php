<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Performance\Domain\Evaluation
 */
final class EvaluationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'scorecard_id' => $this->scorecard_id,
            'subject_user_id' => $this->subject_user_id,
            'evaluator_user_id' => $this->evaluator_user_id,
            'subject' => $this->whenLoaded('subject', fn () => [
                'id' => $this->subject->id,
                'name' => $this->subject->name,
                'email' => $this->subject->email,
                'avatar_url' => $this->subject->avatar_url,
            ]),
            'evaluator' => $this->whenLoaded('evaluator', fn () => [
                'id' => $this->evaluator?->id,
                'name' => $this->evaluator?->name,
                'avatar_url' => $this->evaluator?->avatar_url,
            ]),
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'status' => $this->status->value,
            'scheduled_for' => $this->scheduled_for?->toDateString(),
            'started_at' => $this->started_at?->toIso8601String(),
            'submitted_at' => $this->submitted_at?->toIso8601String(),
            'signed_at' => $this->signed_at?->toIso8601String(),
            'acknowledged_at' => $this->acknowledged_at?->toIso8601String(),
            'overall_score' => $this->overall_score ? (float) $this->overall_score : null,
            'narrative' => $this->narrative,
            'ai_draft_narrative' => $this->ai_draft_narrative,
            'scorecard' => ScorecardResource::make($this->whenLoaded('scorecard')),
            'responses' => EvaluationResponseResource::collection($this->whenLoaded('responses')),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\AI\Domain\AiSummary
 */
final class AiSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'kind' => $this->kind->value,
            'model' => $this->model,
            'content' => $this->content,
            'approved' => $this->isApproved(),
            'approved_at' => $this->approved_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

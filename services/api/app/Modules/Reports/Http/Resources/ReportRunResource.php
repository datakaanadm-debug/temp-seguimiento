<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Resources;

use App\Shared\Storage\TenantStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Reports\Domain\ReportRun
 */
final class ReportRunResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'template_id' => $this->template_id,
            'template' => ReportTemplateResource::make($this->whenLoaded('template')),
            'requested_by' => $this->requested_by,
            'subject_type' => $this->subject_type,
            'subject_id' => $this->subject_id,
            'period_start' => $this->period_start?->toDateString(),
            'period_end' => $this->period_end?->toDateString(),
            'parameters' => $this->parameters,
            'status' => $this->status->value,
            'file_size_bytes' => $this->file_size_bytes,
            'download_url' => $this->when(
                $this->file_key && $this->status->value === 'completed',
                fn () => TenantStorage::temporaryUrl($this->file_key, 900),
            ),
            'error_message' => $this->error_message,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

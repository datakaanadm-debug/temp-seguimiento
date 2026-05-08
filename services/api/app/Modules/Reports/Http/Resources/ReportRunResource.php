<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Resources;

use App\Shared\Storage\TenantStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\URL;

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
                // Pre-signed URL (R2/S3) cuando se puede; si no, signed
                // URL de Laravel al endpoint /file. La firma + TTL hacen
                // segura la URL aunque se abra en una pestaña sin cookies.
                fn () => TenantStorage::temporaryUrl($this->file_key, 900)
                    ?? URL::temporarySignedRoute(
                        'reports.file',
                        now()->addMinutes(15),
                        ['reportRun' => $this->id],
                    ),
            ),
            'error_message' => $this->error_message,
            'started_at' => $this->started_at?->toIso8601String(),
            'completed_at' => $this->completed_at?->toIso8601String(),
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

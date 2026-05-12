<?php

declare(strict_types=1);

namespace App\Modules\Audit\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Audit\Domain\ActivityLog
 */
final class ActivityLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'event' => $this->event,
            'description' => $this->description,
            'subject' => [
                'type' => $this->shortType($this->subject_type),
                'type_full' => $this->subject_type,
                'id' => $this->subject_id,
            ],
            'causer' => [
                'type' => $this->shortType($this->causer_type),
                'id' => $this->causer_id,
                'name' => $this->whenLoaded('causer', fn () => $this->causer?->name ?? $this->causer?->email),
                'email' => $this->whenLoaded('causer', fn () => $this->causer?->email),
            ],
            'properties' => $this->properties ?? [],
            'ip_address' => $this->ip_address,
            'request_id' => $this->request_id,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /** "App\\Modules\\Tasks\\Domain\\Task" → "Task". */
    private function shortType(?string $fqcn): ?string
    {
        if (!$fqcn) return null;
        $parts = explode('\\', $fqcn);
        return end($parts) ?: $fqcn;
    }
}

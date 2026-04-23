<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Reports\Domain\ReportTemplate
 */
final class ReportTemplateResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'name' => $this->name,
            'config' => $this->config,
            'layout' => $this->layout,
            'is_system' => (bool) $this->is_system,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

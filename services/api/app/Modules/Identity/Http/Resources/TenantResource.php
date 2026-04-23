<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Identity\Domain\Tenant
 */
final class TenantResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'plan' => $this->plan->value,
            'status' => $this->status->value,
            'data_residency' => $this->data_residency,
            'settings' => [
                'ai_enabled' => (bool) ($this->settings['ai_enabled'] ?? true),
                'gamification_enabled' => (bool) ($this->settings['gamification_enabled'] ?? false),
                'university_reports_enabled' => (bool) ($this->settings['university_reports_enabled'] ?? true),
            ],
            'theme' => $this->theme ?? [],
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

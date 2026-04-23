<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\People\Domain\MentorData
 */
final class MentorDataResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'expertise' => $this->expertise ?? [],
            'max_mentees' => $this->max_mentees,
            'availability' => $this->availability ?? new \stdClass(),
            'certified' => $this->certified_at !== null,
            'certified_at' => $this->certified_at?->toIso8601String(),
        ];
    }
}

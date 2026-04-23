<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\People\Domain\InternData
 */
final class InternDataResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'university' => $this->university,
            'career' => $this->career,
            'semester' => $this->semester,
            'mandatory_hours' => $this->mandatory_hours,
            'hours_completed' => $this->hours_completed,
            'progress_percent' => $this->progressPercent(),
            'university_advisor' => $this->university_advisor,
            'university_email' => $this->university_email,
            'gpa' => $this->gpa ? (float) $this->gpa : null,
        ];
    }
}

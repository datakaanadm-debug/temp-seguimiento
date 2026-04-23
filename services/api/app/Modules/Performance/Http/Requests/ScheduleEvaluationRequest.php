<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ScheduleEvaluationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'scorecard_id' => ['required', 'uuid', 'exists:scorecards,id'],
            'subject_user_id' => ['required', 'uuid', 'exists:users,id'],
            'evaluator_user_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id', 'different:subject_user_id'],
            'kind' => ['required', 'string', 'in:30d,60d,90d,adhoc,360,onboarding,offboarding'],
            'scheduled_for' => ['required', 'date'],
        ];
    }
}

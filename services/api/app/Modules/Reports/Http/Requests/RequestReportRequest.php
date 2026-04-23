<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RequestReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'template_id' => ['required', 'uuid', 'exists:report_templates,id'],
            'subject_type' => ['sometimes', 'nullable', 'string', 'in:user,team,department,tenant'],
            'subject_id' => ['sometimes', 'nullable', 'uuid'],
            'period_start' => ['sometimes', 'nullable', 'date'],
            'period_end' => ['sometimes', 'nullable', 'date', 'after_or_equal:period_start'],
            'parameters' => ['sometimes', 'array'],
        ];
    }
}

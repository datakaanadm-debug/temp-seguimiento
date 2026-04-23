<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpsertDailyReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'report_date' => ['sometimes', 'date', 'before_or_equal:today'],
            'progress_summary' => ['required', 'string', 'min:10', 'max:10000'],
            'blockers_text' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'plan_tomorrow' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'mood' => ['sometimes', 'nullable', 'string', 'in:great,good,ok,stressed,blocked'],
            'hours_worked' => ['sometimes', 'nullable', 'numeric', 'between:0,24'],
            'submit' => ['sometimes', 'boolean'],
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RaiseBlockerRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'min:3', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'severity' => ['sometimes', 'string', 'in:low,medium,high,critical'],
            'related_task_id' => ['sometimes', 'nullable', 'uuid', 'exists:tasks,id'],
            'daily_report_id' => ['sometimes', 'nullable', 'uuid', 'exists:daily_reports,id'],
        ];
    }
}

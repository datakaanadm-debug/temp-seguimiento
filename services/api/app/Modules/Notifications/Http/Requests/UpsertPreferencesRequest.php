<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpsertPreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array', 'min:1', 'max:100'],
            'preferences.*.channel' => ['required', 'string', 'in:in_app,email,push'],
            'preferences.*.category' => ['required', 'string', 'in:' . implode(',', [
                'task_assigned', 'task_mentioned', 'task_due_soon', 'task_overdue',
                'comment_mentioned', 'blocker_raised',
                'evaluation_scheduled', 'evaluation_submitted',
                'daily_digest', 'weekly_digest',
            ])],
            'preferences.*.enabled' => ['sometimes', 'boolean'],
            'preferences.*.frequency' => ['sometimes', 'string', 'in:immediate,hourly,daily,never'],
            'preferences.*.quiet_hours' => ['sometimes', 'nullable', 'array'],
            'preferences.*.quiet_hours.start' => ['required_with:preferences.*.quiet_hours', 'date_format:H:i'],
            'preferences.*.quiet_hours.end' => ['required_with:preferences.*.quiet_hours', 'date_format:H:i'],
        ];
    }
}

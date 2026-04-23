<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpsertInternDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'university' => ['sometimes', 'nullable', 'string', 'max:200'],
            'career' => ['sometimes', 'nullable', 'string', 'max:150'],
            'semester' => ['sometimes', 'nullable', 'integer', 'between:1,20'],
            'mandatory_hours' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'hours_completed' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10000'],
            'university_advisor' => ['sometimes', 'nullable', 'string', 'max:200'],
            'university_email' => ['sometimes', 'nullable', 'email', 'max:255'],
            'gpa' => ['sometimes', 'nullable', 'numeric', 'between:0,10'],
        ];
    }
}

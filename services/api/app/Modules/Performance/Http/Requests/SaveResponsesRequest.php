<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class SaveResponsesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'responses' => ['required', 'array', 'min:1'],
            'responses.*.value_numeric' => ['sometimes', 'nullable', 'numeric'],
            'responses.*.value_text' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'responses.*.value_json' => ['sometimes', 'nullable', 'array'],
            'narrative' => ['sometimes', 'nullable', 'string', 'max:20000'],
            'overall_score' => ['sometimes', 'nullable', 'numeric', 'between:0,10'],
        ];
    }
}

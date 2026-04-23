<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Requests;

use App\Modules\Performance\Domain\Scorecard;
use Illuminate\Foundation\Http\FormRequest;

final class CreateScorecardRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Scorecard::class) ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'applicable_to' => ['sometimes', 'string', 'in:intern,mentor,staff'],
            'metrics' => ['required', 'array', 'min:1', 'max:30'],
            'metrics.*.key' => ['required', 'string', 'max:60', 'regex:/^[a-z][a-z0-9_]*$/'],
            'metrics.*.label' => ['required', 'string', 'max:150'],
            'metrics.*.type' => ['required', 'string', 'in:auto,manual,likert,rubric'],
            'metrics.*.source' => ['sometimes', 'nullable', 'string', 'max:60'],
            'metrics.*.target_value' => ['sometimes', 'nullable', 'numeric'],
            'metrics.*.unit' => ['sometimes', 'nullable', 'string', 'max:20'],
            'metrics.*.weight' => ['sometimes', 'numeric', 'min:0.01', 'max:10'],
            'metrics.*.config' => ['sometimes', 'array'],
            'metrics.*.position' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

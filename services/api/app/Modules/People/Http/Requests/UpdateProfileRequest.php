<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Gates específicas se aplican en el controller con Policy
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'bio' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'national_id' => ['sometimes', 'nullable', 'string', 'max:50'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before:today'],
            'position_title' => ['sometimes', 'nullable', 'string', 'max:150'],
            'start_date' => ['sometimes', 'nullable', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'kind' => ['sometimes', 'string', 'in:intern,mentor,staff,hr,admin'],
            'skills' => ['sometimes', 'array', 'max:50'],
            'skills.*' => ['string', 'max:60'],
            'social_links' => ['sometimes', 'array'],
            'social_links.*' => ['nullable', 'url', 'max:500'],
            'emergency_contact' => ['sometimes', 'array'],
            'emergency_contact.name' => ['sometimes', 'string', 'max:150'],
            'emergency_contact.phone' => ['sometimes', 'string', 'max:30'],
            'emergency_contact.relationship' => ['sometimes', 'string', 'max:60'],
        ];
    }
}

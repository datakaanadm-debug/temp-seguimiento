<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AssignMentorRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'mentor_user_id' => ['required', 'uuid', 'exists:users,id'],
            'intern_user_id' => ['required', 'uuid', 'exists:users,id', 'different:mentor_user_id'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

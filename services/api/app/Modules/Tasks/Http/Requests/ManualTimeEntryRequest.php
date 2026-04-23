<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ManualTimeEntryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'started_at' => ['required', 'date', 'before_or_equal:now'],
            'ended_at' => ['required', 'date', 'after:started_at', 'before_or_equal:now'],
            'note' => ['sometimes', 'nullable', 'string', 'max:2000'],
        ];
    }
}

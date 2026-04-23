<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class PresignAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'original_name' => ['required', 'string', 'max:255'],
            'content_type' => ['required', 'string', 'max:150'],
            'size_bytes' => ['required', 'integer', 'min:1', 'max:52428800'],
        ];
    }
}

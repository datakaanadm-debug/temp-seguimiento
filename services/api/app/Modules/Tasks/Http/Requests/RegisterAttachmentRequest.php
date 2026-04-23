<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class RegisterAttachmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    public function rules(): array
    {
        return [
            'stored_key' => ['required', 'string', 'max:500'],
            'original_name' => ['required', 'string', 'max:255'],
            'mime_type' => ['required', 'string', 'max:150'],
            'size_bytes' => ['required', 'integer', 'min:1', 'max:52428800'],
            'checksum_sha256' => ['sometimes', 'nullable', 'string', 'size:64', 'regex:/^[0-9a-f]+$/i'],
        ];
    }
}

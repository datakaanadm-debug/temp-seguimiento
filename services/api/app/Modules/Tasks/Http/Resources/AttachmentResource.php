<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Resources;

use App\Shared\Storage\TenantStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tasks\Domain\Attachment
 */
final class AttachmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size_bytes' => $this->size_bytes,
            'is_image' => $this->isImage(),
            // URL pre-firmada de descarga generada en cada response (TTL 15 min).
            // Opción: generar solo en endpoint específico si la lista es grande.
            'download_url' => TenantStorage::temporaryUrl($this->stored_key, 900),
            'uploaded_by' => $this->uploaded_by,
            'uploader' => $this->whenLoaded('uploader', fn () => [
                'id' => $this->uploader?->id,
                'name' => $this->uploader?->name,
            ]),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}

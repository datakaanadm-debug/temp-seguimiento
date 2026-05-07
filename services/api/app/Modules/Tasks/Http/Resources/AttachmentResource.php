<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Resources;

use App\Shared\Storage\TenantStorage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            // Download URL: con R2 genera presigned URL (TTL 15 min).
            // Con disk local (dev) sirve vía endpoint proxy que requiere auth.
            'download_url' => $this->resolveDownloadUrl($this->stored_key, (string) $this->id),
            'uploaded_by' => $this->uploaded_by,
            'uploader' => $this->whenLoaded('uploader', fn () => [
                'id' => $this->uploader?->id,
                'name' => $this->uploader?->name,
            ]),
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }

    private function resolveDownloadUrl(string $storedKey, string $attachmentId): string
    {
        // Si el default disk soporta temporaryUrl (S3/R2), úsalo.
        try {
            return Storage::temporaryUrl($storedKey, now()->addMinutes(15));
        } catch (\Throwable) {
            // Local disk: proxy vía endpoint autenticado
            return route('attachments.download', ['attachment' => $attachmentId]);
        }
    }
}

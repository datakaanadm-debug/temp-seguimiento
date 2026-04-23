<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Task;
use App\Shared\Storage\TenantStorage;

final class PresignAttachmentUploadHandler
{
    private const MAX_BYTES = 52_428_800; // 50 MB
    private const ALLOWED_MIME = [
        'image/png', 'image/jpeg', 'image/webp', 'image/gif',
        'application/pdf',
        'text/csv', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
    ];

    /**
     * @return array{upload_url: string, stored_key: string, headers: array, max_bytes: int}
     */
    public function handle(PresignAttachmentUpload $command): array
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        if (!in_array($command->contentType, self::ALLOWED_MIME, true)) {
            abort(422, 'Content type not allowed');
        }
        if ($command->sizeBytes <= 0 || $command->sizeBytes > self::MAX_BYTES) {
            abort(422, 'File size out of allowed range');
        }

        $key = TenantStorage::buildAttachmentKey(
            subjectType: Task::class,
            subjectId: $task->id,
            originalName: $command->originalName,
        );

        $signed = TenantStorage::presignedUploadUrl(
            key: $key,
            contentType: $command->contentType,
            maxBytes: $command->sizeBytes,
            ttlSeconds: 300,
        );

        return [
            'upload_url' => $signed['url'],
            'stored_key' => $key,
            'headers' => $signed['headers'],
            'max_bytes' => self::MAX_BYTES,
        ];
    }
}

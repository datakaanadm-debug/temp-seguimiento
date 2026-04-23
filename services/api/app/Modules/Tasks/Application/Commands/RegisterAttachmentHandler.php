<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Attachment;
use App\Modules\Tasks\Domain\Task;
use App\Shared\Storage\TenantStorage;

/**
 * Se llama DESPUÉS de que el cliente subió el archivo a la pre-signed URL.
 * Verifica existencia en R2, valida tenancy del key, y crea el registro.
 */
final class RegisterAttachmentHandler
{
    public function handle(RegisterAttachment $command): Attachment
    {
        /** @var Task $task */
        $task = Task::query()->findOrFail($command->taskId);

        TenantStorage::assertBelongsToCurrentTenant($command->storedKey);

        if (!TenantStorage::exists($command->storedKey)) {
            abort(422, 'Upload not found; retry the upload flow');
        }

        return Attachment::create([
            'attachable_type' => Task::class,
            'attachable_id' => $task->id,
            'uploaded_by' => $command->user->id,
            'original_name' => $command->originalName,
            'stored_key' => $command->storedKey,
            'mime_type' => $command->mimeType,
            'size_bytes' => $command->sizeBytes,
            'checksum_sha256' => $command->checksumSha256,
            'metadata' => [],
        ]);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Tasks\Domain\Attachment;
use App\Shared\Storage\TenantStorage;
use Illuminate\Support\Facades\DB;

final class DeleteAttachmentHandler
{
    public function handle(DeleteAttachment $command): void
    {
        /** @var Attachment $attachment */
        $attachment = Attachment::query()->findOrFail($command->attachmentId);

        DB::transaction(function () use ($attachment) {
            $key = $attachment->stored_key;
            $attachment->delete(); // soft delete

            // Hard delete del archivo en R2 (async sería mejor; MVP lo hacemos sync).
            // Si quieres historial forense, comentar esta línea y dejar lifecycle R2.
            try {
                TenantStorage::delete($key);
            } catch (\Throwable $e) {
                report($e); // no fallar el request por eso
            }
        });
    }
}

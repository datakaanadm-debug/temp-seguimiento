<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Controllers;

use App\Modules\Tasks\Application\Commands\DeleteAttachment;
use App\Modules\Tasks\Application\Commands\DeleteAttachmentHandler;
use App\Modules\Tasks\Application\Commands\PresignAttachmentUpload;
use App\Modules\Tasks\Application\Commands\PresignAttachmentUploadHandler;
use App\Modules\Tasks\Application\Commands\RegisterAttachment;
use App\Modules\Tasks\Application\Commands\RegisterAttachmentHandler;
use App\Modules\Tasks\Domain\Attachment;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Http\Requests\PresignAttachmentRequest;
use App\Modules\Tasks\Http\Requests\RegisterAttachmentRequest;
use App\Modules\Tasks\Http\Resources\AttachmentResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class AttachmentController extends Controller
{
    public function __construct(
        private readonly PresignAttachmentUploadHandler $presignHandler,
        private readonly RegisterAttachmentHandler $registerHandler,
        private readonly DeleteAttachmentHandler $deleteHandler,
    ) {}

    public function index(Task $task, Request $request): JsonResponse
    {
        $this->authorize('view', $task);

        $items = Attachment::query()
            ->where('attachable_type', Task::class)
            ->where('attachable_id', $task->id)
            ->whereNull('deleted_at')
            ->with('uploader')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => AttachmentResource::collection($items),
        ]);
    }

    public function presign(Task $task, PresignAttachmentRequest $request): JsonResponse
    {
        $this->authorize('update', $task);

        $signed = $this->presignHandler->handle(new PresignAttachmentUpload(
            taskId: $task->id,
            user: $request->user(),
            originalName: $request->string('original_name'),
            contentType: $request->string('content_type'),
            sizeBytes: (int) $request->integer('size_bytes'),
        ));

        return response()->json($signed);
    }

    public function store(Task $task, RegisterAttachmentRequest $request): JsonResponse
    {
        $this->authorize('update', $task);

        $attachment = $this->registerHandler->handle(new RegisterAttachment(
            taskId: $task->id,
            user: $request->user(),
            storedKey: $request->string('stored_key'),
            originalName: $request->string('original_name'),
            mimeType: $request->string('mime_type'),
            sizeBytes: (int) $request->integer('size_bytes'),
            checksumSha256: $request->string('checksum_sha256') ?: null,
        ));

        return response()->json([
            'data' => AttachmentResource::make($attachment->load('uploader'))->resolve(),
        ], 201);
    }

    public function destroy(Attachment $attachment, Request $request): JsonResponse
    {
        $isOwner = $attachment->uploaded_by === $request->user()->id;
        $canManage = in_array($request->user()->primaryRole()?->value, ['tenant_admin', 'hr', 'team_lead'], true);

        if (!$isOwner && !$canManage) {
            abort(403);
        }

        $this->deleteHandler->handle(new DeleteAttachment(
            attachmentId: $attachment->id,
            actor: $request->user(),
        ));

        return response()->json(['ok' => true]);
    }
}

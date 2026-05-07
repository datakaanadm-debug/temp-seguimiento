<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Onboarding\Domain\OnboardingItem;
use App\Modules\Tasks\Domain\Attachment;
use App\Shared\Support\Uuid;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Attachments para items de onboarding (documentos tipo contrato, INE, NDA, etc).
 *
 * Usa la tabla polymorphic `attachments` con attachable_type = OnboardingItem::class.
 * En dev almacena en disk `local` (storage/app/private/onboarding/{tenant}/{user}/{id}).
 * En prod con FILESYSTEM_DISK=r2 todo fluye a Cloudflare R2 sin cambios de código.
 *
 * Al subir al menos 1 attachment, el item se marca automáticamente como done.
 */
final class OnboardingAttachmentController extends Controller
{
    public function index(Request $request, OnboardingItem $item): JsonResponse
    {
        $this->authorizeAccess($request, $item);

        $items = Attachment::query()
            ->where('attachable_type', OnboardingItem::class)
            ->where('attachable_id', $item->id)
            ->whereNull('deleted_at')
            ->with('uploader')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $items->map(fn ($a) => [
                'id' => $a->id,
                'original_name' => $a->original_name,
                'mime_type' => $a->mime_type,
                'size_bytes' => (int) $a->size_bytes,
                'is_image' => $a->isImage(),
                'download_url' => route('onboarding.attachments.download', ['attachment' => $a->id]),
                'uploaded_by' => $a->uploaded_by,
                'uploader' => $a->uploader ? [
                    'id' => $a->uploader->id,
                    'name' => $a->uploader->name,
                ] : null,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request, OnboardingItem $item): JsonResponse
    {
        $this->authorizeAccess($request, $item, write: true);

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10 MB
        ]);

        $file = $request->file('file');
        $tenantId = TenantContext::currentId();
        $storedKey = sprintf(
            'onboarding/%s/%s/%s-%s',
            $tenantId,
            $item->intern_user_id,
            (string) Uuid::v7(),
            preg_replace('/[^a-zA-Z0-9._-]/', '_', (string) $file->getClientOriginalName()),
        );

        Storage::put($storedKey, file_get_contents($file->getRealPath()));

        $attachment = Attachment::create([
            'tenant_id' => $tenantId,
            'attachable_type' => OnboardingItem::class,
            'attachable_id' => $item->id,
            'uploaded_by' => $request->user()->id,
            'original_name' => (string) $file->getClientOriginalName(),
            'stored_key' => $storedKey,
            'mime_type' => (string) ($file->getMimeType() ?? 'application/octet-stream'),
            'size_bytes' => (int) $file->getSize(),
            'metadata' => [],
        ]);

        // Al subir primer documento, marca item como done automáticamente
        if (!$item->done) {
            $item->done = true;
            $item->completed_at = now();
            $item->completed_by = $request->user()->id;
            $item->save();
        }

        return response()->json([
            'data' => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size_bytes' => (int) $attachment->size_bytes,
                'is_image' => $attachment->isImage(),
                'download_url' => route('onboarding.attachments.download', ['attachment' => $attachment->id]),
                'created_at' => $attachment->created_at->toIso8601String(),
            ],
            'item' => [
                'id' => $item->id,
                'done' => (bool) $item->done,
            ],
        ], 201);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        // Solo owner o staff (admin/hr/team_lead) puede borrar
        $actor = $request->user();
        $isOwner = $attachment->uploaded_by === $actor->id;
        $canManage = in_array($actor->primaryRole()?->value, ['tenant_admin', 'hr', 'team_lead'], true);
        if (!$isOwner && !$canManage) {
            abort(403);
        }

        if ($attachment->attachable_type !== OnboardingItem::class) {
            abort(404);
        }

        Storage::delete($attachment->stored_key);
        $attachment->delete();

        return response()->json(['ok' => true]);
    }

    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        if ($attachment->attachable_type !== OnboardingItem::class) {
            abort(404);
        }

        // Permisos: el propio intern, staff (admin/hr/team_lead), o el mentor asignado
        $actor = $request->user();
        $item = OnboardingItem::findOrFail($attachment->attachable_id);

        $allowed = $actor->id === $item->intern_user_id
            || in_array($actor->primaryRole()?->value, ['tenant_admin', 'hr', 'team_lead'], true)
            || $this->isMentorOf($actor->id, $item->intern_user_id);

        if (!$allowed) {
            abort(403);
        }

        return Storage::download(
            $attachment->stored_key,
            $attachment->original_name,
        );
    }

    private function authorizeAccess(Request $request, OnboardingItem $item, bool $write = false): void
    {
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;

        $isIntern = $actor->id === $item->intern_user_id;
        $isStaff = in_array($role, ['tenant_admin', 'hr', 'team_lead'], true);
        $isMentor = $this->isMentorOf($actor->id, $item->intern_user_id);

        if (!$isIntern && !$isStaff && !$isMentor) {
            abort(403);
        }

        if ($write && !$isIntern && !$isStaff) {
            abort(403, 'Solo el practicante o staff puede subir documentos.');
        }
    }

    private function isMentorOf(string $mentorUserId, string $internUserId): bool
    {
        return DB::table('mentor_assignments')
            ->where('mentor_user_id', $mentorUserId)
            ->where('intern_user_id', $internUserId)
            ->where('status', 'active')
            ->exists();
    }
}

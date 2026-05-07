<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tasks\Domain\Attachment;
use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Support\Uuid;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Attachments en daily_reports — adjuntos del practicante a su bitácora.
 *
 * Reusa la tabla polymorphic `attachments` con attachable_type=DailyReport.
 * Patrón idéntico al de OnboardingAttachmentController (storage local en dev,
 * R2 en prod transparente).
 */
final class DailyReportAttachmentController extends Controller
{
    public function index(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureCanView($request, $dailyReport);

        $items = Attachment::query()
            ->where('attachable_type', DailyReport::class)
            ->where('attachable_id', $dailyReport->id)
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
                'download_url' => route('daily-reports.attachments.download', ['attachment' => $a->id]),
                'uploaded_by' => $a->uploaded_by,
                'uploader' => $a->uploader ? [
                    'id' => $a->uploader->id,
                    'name' => $a->uploader->name,
                ] : null,
                'created_at' => $a->created_at->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request, DailyReport $dailyReport): JsonResponse
    {
        $this->ensureOwner($request, $dailyReport);

        $request->validate([
            'file' => ['required', 'file', 'max:10240'], // 10 MB
        ]);

        $file = $request->file('file');
        $tenantId = TenantContext::currentId();
        $storedKey = sprintf(
            'daily-reports/%s/%s/%s-%s',
            $tenantId,
            $dailyReport->id,
            (string) Uuid::v7(),
            preg_replace('/[^a-zA-Z0-9._-]/', '_', (string) $file->getClientOriginalName()),
        );

        Storage::put($storedKey, file_get_contents($file->getRealPath()));

        $attachment = Attachment::create([
            'tenant_id' => $tenantId,
            'attachable_type' => DailyReport::class,
            'attachable_id' => $dailyReport->id,
            'uploaded_by' => $request->user()->id,
            'original_name' => (string) $file->getClientOriginalName(),
            'stored_key' => $storedKey,
            'mime_type' => (string) ($file->getMimeType() ?? 'application/octet-stream'),
            'size_bytes' => (int) $file->getSize(),
            'metadata' => [],
        ]);

        return response()->json([
            'data' => [
                'id' => $attachment->id,
                'original_name' => $attachment->original_name,
                'mime_type' => $attachment->mime_type,
                'size_bytes' => (int) $attachment->size_bytes,
                'is_image' => $attachment->isImage(),
                'download_url' => route('daily-reports.attachments.download', ['attachment' => $attachment->id]),
                'created_at' => $attachment->created_at->toIso8601String(),
            ],
        ], 201);
    }

    public function destroy(Request $request, Attachment $attachment): JsonResponse
    {
        if ($attachment->attachable_type !== DailyReport::class) {
            abort(404);
        }

        $isOwner = $attachment->uploaded_by === $request->user()->id;
        $canManage = in_array($request->user()->primaryRole()?->value, ['tenant_admin', 'hr', 'team_lead'], true);
        if (!$isOwner && !$canManage) {
            abort(403);
        }

        Storage::delete($attachment->stored_key);
        $attachment->delete();

        return response()->json(['ok' => true]);
    }

    public function download(Request $request, Attachment $attachment): StreamedResponse
    {
        if ($attachment->attachable_type !== DailyReport::class) {
            abort(404);
        }
        $report = DailyReport::findOrFail($attachment->attachable_id);
        $this->ensureCanView($request, $report);

        return Storage::download($attachment->stored_key, $attachment->original_name);
    }

    private function ensureCanView(Request $request, DailyReport $report): void
    {
        $actor = $request->user();
        $role = $actor->primaryRole()?->value;
        $isOwner = $actor->id === $report->user_id;
        $isStaff = in_array($role, ['tenant_admin', 'hr', 'team_lead'], true);
        $isMentor = \DB::table('mentor_assignments')
            ->where('mentor_user_id', $actor->id)
            ->where('intern_user_id', $report->user_id)
            ->where('status', 'active')
            ->exists();

        if (!$isOwner && !$isStaff && !$isMentor) {
            abort(403);
        }
    }

    private function ensureOwner(Request $request, DailyReport $report): void
    {
        if ($request->user()->id !== $report->user_id) {
            abort(403, 'Solo el dueño del reporte puede subir adjuntos.');
        }
    }
}

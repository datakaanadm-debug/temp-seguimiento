<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Controllers;

use App\Modules\Reports\Application\Commands\RequestReport;
use App\Modules\Reports\Application\Commands\RequestReportHandler;
use App\Modules\Reports\Domain\ReportRun;
use App\Modules\Reports\Http\Requests\RequestReportRequest;
use App\Modules\Reports\Http\Resources\ReportRunResource;
use App\Shared\Storage\TenantStorage;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\StreamedResponse;
use App\Http\Controllers\Controller;

final class ReportRunController extends Controller
{
    public function __construct(
        private readonly RequestReportHandler $requestHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ReportRun::class);

        $query = ReportRun::query()->with('template');

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($request->boolean('mine')) {
            $query->where('requested_by', $request->user()->id);
        }
        if ($tpl = $request->query('template_id')) {
            $query->where('template_id', $tpl);
        }

        $items = $query->orderByDesc('created_at')->paginate((int) $request->integer('per_page', 30));

        return response()->json([
            'data' => ReportRunResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    public function show(ReportRun $reportRun): JsonResponse
    {
        $this->authorize('view', $reportRun);
        $reportRun->load('template');

        return response()->json([
            'data' => ReportRunResource::make($reportRun)->resolve(),
        ]);
    }

    public function store(RequestReportRequest $request): JsonResponse
    {
        $this->authorize('create', ReportRun::class);

        // `Request::string()` retorna Stringable; el command tipa string,
        // cast explícito + nullable para los opcionales.
        $run = $this->requestHandler->handle(new RequestReport(
            templateId: (string) $request->string('template_id'),
            requester: $request->user(),
            subjectType: $request->filled('subject_type') ? (string) $request->string('subject_type') : null,
            subjectId: $request->filled('subject_id') ? (string) $request->string('subject_id') : null,
            periodStart: $request->filled('period_start') ? (string) $request->string('period_start') : null,
            periodEnd: $request->filled('period_end') ? (string) $request->string('period_end') : null,
            parameters: (array) $request->input('parameters', []),
        ));

        // Refrescamos para reflejar el estado real tras el dispatch.
        // Con QUEUE_CONNECTION=sync el job ya corrió y el run pasó a
        // `completed` (o `failed`); con queue async sigue en `queued`.
        // El cliente decide qué mensaje mostrar según `data.status`.
        $run->refresh()->load('template');
        $statusCode = $run->status->value === 'completed' ? 201 : 202;

        return response()->json([
            'data' => ReportRunResource::make($run)->resolve(),
        ], $statusCode);
    }

    /**
     * GET /reports/{run}/download
     *
     * Devuelve el URL para bajar el archivo. Si el storage soporta
     * pre-signed (R2/S3), devuelve esa URL directa con TTL. Si no
     * (local disk en dev), devuelve una **signed URL** de Laravel al
     * endpoint /file — al abrirse en pestaña nueva no necesita cookies
     * ni header X-Tenant-Slug porque la firma la valida el middleware.
     */
    public function download(ReportRun $reportRun, Request $request): JsonResponse
    {
        $this->authorize('download', $reportRun);

        if (!$reportRun->file_key || $reportRun->status->value !== 'completed') {
            abort(409, 'Report is not ready yet');
        }
        if ($reportRun->expires_at?->isPast()) {
            abort(410, 'Report has expired');
        }

        $external = TenantStorage::temporaryUrl($reportRun->file_key, 900);
        $url = $external ?? URL::temporarySignedRoute(
            'reports.file',
            now()->addMinutes(15),
            ['reportRun' => $reportRun->id],
        );

        return response()->json([
            'download_url' => $url,
            'expires_in_seconds' => 900,
        ]);
    }

    /**
     * GET /reports/{run}/file?signature=...
     *
     * Stream el PDF. Protegido por signed URL (no por sanctum/tenant
     * middleware) — la firma criptográfica de Laravel valida que el URL
     * fue emitido por nosotros y no caducó. El tenant context se infiere
     * del propio ReportRun.tenant_id.
     */
    public function file(string $reportRun): StreamedResponse
    {
        // No tenemos TenantContext aún (la ruta es signed, sin
        // middleware tenant). Buscamos el run sin global scopes.
        /** @var ReportRun|null $run */
        $run = ReportRun::query()->withoutGlobalScopes()->find($reportRun);
        if (!$run) {
            abort(404);
        }

        if (!$run->file_key || $run->status->value !== 'completed') {
            abort(409, 'Report is not ready yet');
        }
        if ($run->expires_at?->isPast()) {
            abort(410, 'Report has expired');
        }

        // Defensa: el file_key debe pertenecer al tenant del run.
        $expectedPrefix = "tenants/{$run->tenant_id}/";
        if (!str_starts_with((string) $run->file_key, $expectedPrefix)) {
            abort(403, 'File key does not match run tenant');
        }

        // Setear contexto para que cualquier consumer downstream (ej. RLS)
        // tenga el tenant correcto. También hace set_config en Postgres.
        TenantContext::setCurrentById($run->tenant_id);
        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$run->tenant_id]);

        $disk = Storage::disk(TenantStorage::DISK);
        if (!$disk->exists($run->file_key)) {
            abort(404, 'File not found in storage');
        }

        $filename = basename($run->file_key);

        return $disk->response($run->file_key, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }
}

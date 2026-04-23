<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Controllers;

use App\Modules\Reports\Application\Commands\RequestReport;
use App\Modules\Reports\Application\Commands\RequestReportHandler;
use App\Modules\Reports\Domain\ReportRun;
use App\Modules\Reports\Http\Requests\RequestReportRequest;
use App\Modules\Reports\Http\Resources\ReportRunResource;
use App\Shared\Storage\TenantStorage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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

        $run = $this->requestHandler->handle(new RequestReport(
            templateId: $request->string('template_id'),
            requester: $request->user(),
            subjectType: $request->string('subject_type') ?: null,
            subjectId: $request->string('subject_id') ?: null,
            periodStart: $request->string('period_start') ?: null,
            periodEnd: $request->string('period_end') ?: null,
            parameters: (array) $request->input('parameters', []),
        ));

        return response()->json([
            'data' => ReportRunResource::make($run->load('template'))->resolve(),
        ], 202);  // 202 Accepted — procesamiento async
    }

    public function download(ReportRun $reportRun): JsonResponse
    {
        $this->authorize('download', $reportRun);

        if (!$reportRun->file_key || $reportRun->status->value !== 'completed') {
            abort(409, 'Report is not ready yet');
        }
        if ($reportRun->expires_at?->isPast()) {
            abort(410, 'Report has expired');
        }

        return response()->json([
            'download_url' => TenantStorage::temporaryUrl($reportRun->file_key, 900),
            'expires_in_seconds' => 900,
        ]);
    }
}

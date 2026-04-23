<?php

declare(strict_types=1);

namespace App\Modules\Reports\Http\Controllers;

use App\Modules\Reports\Domain\ReportTemplate;
use App\Modules\Reports\Http\Requests\CreateTemplateRequest;
use App\Modules\Reports\Http\Resources\ReportTemplateResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class ReportTemplateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ReportTemplate::class);

        $query = ReportTemplate::query();
        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }
        return response()->json([
            'data' => ReportTemplateResource::collection($query->orderBy('name')->get()),
        ]);
    }

    public function store(CreateTemplateRequest $request): JsonResponse
    {
        $this->authorize('create', ReportTemplate::class);

        $template = ReportTemplate::create([
            'kind' => $request->string('kind'),
            'name' => $request->string('name'),
            'config' => (array) $request->input('config', []),
            'layout' => $request->string('layout', 'default'),
            'is_system' => false,
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'data' => ReportTemplateResource::make($template)->resolve(),
        ], 201);
    }

    public function show(ReportTemplate $reportTemplate): JsonResponse
    {
        $this->authorize('view', $reportTemplate);
        return response()->json([
            'data' => ReportTemplateResource::make($reportTemplate)->resolve(),
        ]);
    }

    public function update(ReportTemplate $reportTemplate, Request $request): JsonResponse
    {
        $this->authorize('update', $reportTemplate);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'config' => ['sometimes', 'array'],
            'layout' => ['sometimes', 'string', 'max:50'],
        ]);
        $reportTemplate->fill($validated);
        $reportTemplate->save();

        return response()->json([
            'data' => ReportTemplateResource::make($reportTemplate)->resolve(),
        ]);
    }

    public function destroy(ReportTemplate $reportTemplate): JsonResponse
    {
        $this->authorize('delete', $reportTemplate);
        $reportTemplate->delete();
        return response()->json(['ok' => true]);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Audit\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Audit\Domain\ActivityLog;
use App\Modules\Audit\Http\Resources\ActivityLogResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/v1/audit-log
 * Filtros opcionales: log_name, event, causer_id, subject_type,
 *                     from (ISO), to (ISO), per_page.
 */
final class AuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', ActivityLog::class);

        $query = ActivityLog::query()
            ->with(['causer'])
            ->orderByDesc('created_at');

        if ($logName = $request->query('log_name')) {
            $query->where('log_name', $logName);
        }
        if ($event = $request->query('event')) {
            $query->where('event', $event);
        }
        if ($causer = $request->query('causer_id')) {
            $query->where('causer_id', $causer);
        }
        if ($subjectType = $request->query('subject_type')) {
            // Permitimos shortname (Task) o FQCN. Si trae backslashes asumimos
            // que ya viene completo.
            if (!str_contains($subjectType, '\\')) {
                $query->where('subject_type', 'like', '%\\' . $subjectType);
            } else {
                $query->where('subject_type', $subjectType);
            }
        }
        if ($from = $request->query('from')) {
            $query->where('created_at', '>=', $from);
        }
        if ($to = $request->query('to')) {
            $query->where('created_at', '<=', $to);
        }
        if ($search = $request->query('q')) {
            $query->where(fn ($q) => $q
                ->where('description', 'ilike', "%{$search}%")
                ->orWhere('event', 'ilike', "%{$search}%"));
        }

        $perPage = min((int) $request->integer('per_page', 50), 200);
        $items = $query->paginate($perPage);

        return response()->json([
            'data' => ActivityLogResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/audit-log/log-names
     * Distinct list de log_name para poblar el dropdown del filtro.
     */
    public function logNames(): JsonResponse
    {
        $this->authorize('viewAny', ActivityLog::class);

        $names = ActivityLog::query()
            ->whereNotNull('log_name')
            ->distinct()
            ->orderBy('log_name')
            ->pluck('log_name')
            ->values();

        return response()->json(['data' => $names]);
    }
}

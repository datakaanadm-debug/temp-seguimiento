<?php

declare(strict_types=1);

namespace App\Modules\Calendar\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Calendar\Domain\CalendarEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class CalendarController extends Controller
{
    /**
     * GET /api/v1/calendar/today
     *
     * Agrega eventos del día para el usuario actual:
     * - calendar_events (del usuario)
     * - mentor_sessions (donde es mentor o intern)
     * - evaluations (scheduled_for = hoy, donde es subject o evaluator)
     */
    public function today(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = TenantContext::currentId();
        $tz = $user->timezone ?? 'America/Mexico_City';

        $dayParam = $request->query('date');
        $day = $dayParam ? Carbon::parse($dayParam, $tz) : Carbon::now($tz);
        $dayStart = $day->copy()->startOfDay();
        $dayEnd = $day->copy()->endOfDay();

        $items = [];

        // 1) Eventos "libres"
        $events = CalendarEvent::where('user_id', $user->id)
            ->whereBetween('starts_at', [$dayStart, $dayEnd])
            ->orderBy('starts_at')
            ->get();
        foreach ($events as $e) {
            $items[] = [
                'source' => 'event',
                'id' => $e->id,
                'starts_at' => $e->starts_at->toIso8601String(),
                'duration_minutes' => (int) $e->duration_minutes,
                'title' => $e->title,
                'kind' => $e->kind,
                'location' => $e->location,
                'tags' => [$e->kind],
                'link' => null,
            ];
        }

        // 2) Sesiones 1:1 (donde el user es mentor o intern)
        $sessions = DB::table('mentor_sessions')
            ->where('tenant_id', $tenantId)
            ->whereBetween('scheduled_at', [$dayStart, $dayEnd])
            ->where(function ($q) use ($user) {
                $q->where('mentor_user_id', $user->id)->orWhere('intern_user_id', $user->id);
            })
            ->where('status', '!=', 'cancelled')
            ->orderBy('scheduled_at')
            ->get();
        foreach ($sessions as $s) {
            $items[] = [
                'source' => 'mentor_session',
                'id' => $s->id,
                'starts_at' => Carbon::parse($s->scheduled_at)->toIso8601String(),
                'duration_minutes' => (int) $s->duration_minutes,
                'title' => $s->topic,
                'kind' => '1on1',
                'location' => $s->location,
                'tags' => ['mentoría'],
                'link' => '/mentoria',
            ];
        }

        // 3) Evaluaciones programadas para hoy (donde el user es subject o evaluator)
        $evals = DB::table('evaluations')
            ->where('tenant_id', $tenantId)
            ->whereDate('scheduled_for', $day->toDateString())
            ->where(function ($q) use ($user) {
                $q->where('subject_user_id', $user->id)->orWhere('evaluator_user_id', $user->id);
            })
            ->whereIn('status', ['SCHEDULED', 'IN_PROGRESS'])
            ->get();
        foreach ($evals as $ev) {
            $items[] = [
                'source' => 'evaluation',
                'id' => $ev->id,
                // Evaluations only have a date — fold in at 09:00 local
                'starts_at' => Carbon::parse($ev->scheduled_for, $tz)->setTime(9, 0)->toIso8601String(),
                'duration_minutes' => 45,
                'title' => 'Evaluación ' . $this->evalKindLabel($ev->kind),
                'kind' => 'review',
                'location' => null,
                'tags' => ['evaluación'],
                'link' => '/evaluaciones/' . $ev->id,
            ];
        }

        // Ordenar por starts_at
        usort($items, fn ($a, $b) => strcmp($a['starts_at'], $b['starts_at']));

        return response()->json([
            'data' => $items,
            'meta' => [
                'date' => $day->toDateString(),
                'timezone' => $tz,
                'count' => count($items),
            ],
        ]);
    }

    /**
     * POST /api/v1/calendar-events
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'user_id' => ['nullable', 'uuid'],
            'starts_at' => ['required', 'date'],
            'duration_minutes' => ['nullable', 'integer', 'min:5', 'max:480'],
            'title' => ['required', 'string', 'max:300'],
            'kind' => ['required', 'in:meeting,sync,1on1,focus,standup,review,other'],
            'location' => ['nullable', 'string', 'max:200'],
            'description' => ['nullable', 'string', 'max:2000'],
        ]);

        // RBAC: si se pasa `user_id` distinto al actor, solo admin/HR pueden
        // crear eventos en agenda ajena. Antes esto NO se validaba — cualquier
        // usuario podía meter eventos en el calendario de otro.
        $actor = $request->user();
        $targetUserId = $data['user_id'] ?? $actor->id;
        if ($targetUserId !== $actor->id) {
            $role = $actor->primaryRole();
            $canScheduleForOthers = in_array($role, [
                \App\Modules\Identity\Domain\Enums\MembershipRole::TenantAdmin,
                \App\Modules\Identity\Domain\Enums\MembershipRole::HR,
            ], true);
            if (!$canScheduleForOthers) {
                abort(403, 'No tienes permiso para agendar eventos en la agenda de otro usuario.');
            }
        }

        $event = CalendarEvent::create([
            'tenant_id' => TenantContext::currentId(),
            'user_id' => $targetUserId,
            'created_by' => $actor->id,
            'starts_at' => Carbon::parse($data['starts_at']),
            'duration_minutes' => $data['duration_minutes'] ?? 30,
            'title' => $data['title'],
            'kind' => $data['kind'],
            'location' => $data['location'] ?? null,
            'description' => $data['description'] ?? null,
            'metadata' => [],
        ]);

        return response()->json(['data' => $event], 201);
    }

    public function destroy(string $id): JsonResponse
    {
        $e = CalendarEvent::findOrFail($id);

        // Solo el dueño del evento o admin/HR pueden borrar. Antes destroy
        // buscaba el evento por id global y lo borraba sin authorize.
        $actor = request()->user();
        $isOwner = $e->user_id === $actor->id;
        $isStaff = in_array($actor->primaryRole(), [
            \App\Modules\Identity\Domain\Enums\MembershipRole::TenantAdmin,
            \App\Modules\Identity\Domain\Enums\MembershipRole::HR,
        ], true);
        if (!$isOwner && !$isStaff) {
            abort(403, 'No tienes permiso para borrar este evento.');
        }

        $e->delete();
        return response()->json(['ok' => true]);
    }

    private function evalKindLabel(string $kind): string
    {
        return match ($kind) {
            '30d' => '30 días',
            '60d' => '60 días',
            '90d' => '90 días',
            '360' => '360°',
            'onboarding' => 'onboarding',
            'offboarding' => 'salida',
            default => 'ad-hoc',
        };
    }
}

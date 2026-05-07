<?php

declare(strict_types=1);

namespace App\Modules\Search\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Búsqueda global usada por el ⌘K command palette.
 *
 * Estrategia:
 *  - Una sola consulta UNION-style por categoría (4 queries pequeñas) en
 *    paralelo con Eloquent. Cada categoría limita a 5 resultados.
 *  - Filtra por tenant (RLS extra defensa) y por visibilidad según rol:
 *     - intern: solo tareas asignadas a él, su mentor, sus propios OKRs.
 *     - staff: todo dentro del tenant.
 *  - Sin full-text search por ahora (ILIKE sobre name/title/email). Si el
 *    catálogo crece, migrar a tsvector.
 *
 * Response shape:
 *   { results: [{ type, id, title, subtitle, url, icon }] }
 */
final class SearchController extends Controller
{
    private const PER_TYPE_LIMIT = 5;

    public function __invoke(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));
        if (mb_strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $actor = $request->user();
        $tenantId = TenantContext::currentId();
        $role = $actor?->primaryRole();
        $isStaff = in_array($role, [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
            MembershipRole::Mentor,
            MembershipRole::Supervisor,
        ], true);

        $like = '%' . $this->escapeLike($q) . '%';
        $results = [];

        // 1) Tareas
        $tasksQ = DB::table('tasks')
            ->where('tenant_id', $tenantId)
            ->whereNull('deleted_at')
            ->where('title', 'ilike', $like);

        if (!$isStaff && $actor) {
            $tasksQ->where(fn ($q) => $q
                ->where('assignee_id', $actor->id)
                ->orWhere('reviewer_id', $actor->id)
                ->orWhere('created_by', $actor->id));
        }

        foreach ($tasksQ->limit(self::PER_TYPE_LIMIT)->get(['id', 'title', 'state', 'project_id']) as $row) {
            $results[] = [
                'type' => 'task',
                'id' => $row->id,
                'title' => $row->title,
                'subtitle' => 'Tarea · ' . $row->state,
                'url' => "/tareas/{$row->id}",
                'icon' => 'Tasks',
            ];
        }

        // 2) Proyectos (solo staff los ve listados)
        if ($isStaff) {
            $projects = DB::table('projects')
                ->where('tenant_id', $tenantId)
                ->whereNull('deleted_at')
                ->where('name', 'ilike', $like)
                ->limit(self::PER_TYPE_LIMIT)
                ->get(['id', 'name', 'status']);

            foreach ($projects as $row) {
                $results[] = [
                    'type' => 'project',
                    'id' => $row->id,
                    'title' => $row->name,
                    'subtitle' => "Proyecto · {$row->status}",
                    'url' => "/proyectos/{$row->id}",
                    'icon' => 'Panel',
                ];
            }
        }

        // 3) Personas (intern solo ve a su mentor + sí mismo)
        $peopleQ = DB::table('users as u')
            ->join('memberships as m', 'm.user_id', '=', 'u.id')
            ->where('m.tenant_id', $tenantId)
            ->where('m.status', 'active')
            ->where(fn ($q) => $q
                ->where('u.name', 'ilike', $like)
                ->orWhere('u.email', 'ilike', $like))
            ->select('u.id', 'u.name', 'u.email', 'm.role');

        if (!$isStaff && $actor) {
            $mentorIds = DB::table('mentor_assignments')
                ->where('intern_user_id', $actor->id)
                ->where('status', 'active')
                ->pluck('mentor_user_id')
                ->push($actor->id)
                ->all();
            $peopleQ->whereIn('u.id', $mentorIds);
        }

        foreach ($peopleQ->limit(self::PER_TYPE_LIMIT)->get() as $row) {
            $results[] = [
                'type' => 'person',
                'id' => $row->id,
                'title' => $row->name ?? $row->email,
                'subtitle' => 'Persona · ' . $this->roleLabel($row->role),
                'url' => "/practicantes/{$row->id}",
                'icon' => 'People',
            ];
        }

        // 4) OKRs (objectives)
        $okrsQ = DB::table('objectives')
            ->where('tenant_id', $tenantId)
            ->where('label', 'ilike', $like);

        if (!$isStaff && $actor) {
            $okrsQ->where('owner_type', 'user')->where('owner_id', $actor->id);
        }

        foreach ($okrsQ->limit(self::PER_TYPE_LIMIT)->get(['id', 'label', 'quarter', 'level']) as $row) {
            $results[] = [
                'type' => 'okr',
                'id' => $row->id,
                'title' => $row->label,
                'subtitle' => "OKR · {$row->quarter} · {$row->level}",
                'url' => "/okrs?objective={$row->id}",
                'icon' => 'Flag',
            ];
        }

        return response()->json(['results' => $results]);
    }

    private function escapeLike(string $s): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $s);
    }

    private function roleLabel(?string $role): string
    {
        return match ($role) {
            'tenant_admin' => 'Admin',
            'hr' => 'RRHH',
            'team_lead' => 'Líder',
            'mentor' => 'Mentor',
            'intern' => 'Practicante',
            'supervisor' => 'Supervisor',
            'viewer' => 'Observador',
            default => ucfirst((string) $role),
        };
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Mentorship\Domain\MentorSession;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Quién puede ver/crear/modificar sesiones de mentoría.
 *
 * Regla general: una sesión pertenece a un par (mentor, intern). Solo ellos
 * dos + roles de gestión (HR, admin, team_lead del team del intern) tocan
 * la sesión. Otros interns o mentores del mismo tenant NO deben ver sesiones
 * ajenas (info sensible: notas, agenda, performance).
 *
 * Ante de este policy el controller no llamaba a authorize() — cualquier user
 * autenticado del tenant podía listar/crear/modificar sesiones de otros.
 */
final class MentorSessionPolicy
{
    public function viewAny(User $user): bool
    {
        // Filtro real en query (mine_as_mentor / mine_as_intern) hace el resto.
        // El listing crudo (sin filtros) cae al scopeByRole de abajo en el controller.
        return $user->currentMembership() !== null;
    }

    public function view(User $user, MentorSession $session): bool
    {
        if ($session->tenant_id !== TenantContext::currentId()) {
            return false;
        }

        $role = $user->primaryRole();

        // Admin/HR ven todo.
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }

        // El mentor o el intern de la sesión.
        if ($session->mentor_user_id === $user->id || $session->intern_user_id === $user->id) {
            return true;
        }

        // Team lead del team del intern.
        if ($role === MembershipRole::TeamLead) {
            return DB::table('team_memberships as tm')
                ->join('teams as t', 't.id', '=', 'tm.team_id')
                ->where('tm.user_id', $session->intern_user_id)
                ->where('t.lead_user_id', $user->id)
                ->where('t.tenant_id', TenantContext::currentId())
                ->whereNull('tm.left_at')
                ->exists();
        }

        return false;
    }

    public function create(User $user): bool
    {
        // Crear sesiones: admin/hr/team_lead (programan a sus interns) o
        // mentor (programa con sus interns asignados).
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
            MembershipRole::Mentor,
        ], true);
    }

    public function update(User $user, MentorSession $session): bool
    {
        if ($session->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        $role = $user->primaryRole();
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }
        // Solo el mentor asignado puede actualizar (cambiar status, notas, etc).
        return $session->mentor_user_id === $user->id;
    }

    public function delete(User $user, MentorSession $session): bool
    {
        if ($session->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }
}

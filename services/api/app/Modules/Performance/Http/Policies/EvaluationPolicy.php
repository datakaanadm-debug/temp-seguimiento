<?php

declare(strict_types=1);

namespace App\Modules\Performance\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Evaluation;
use App\Shared\Tenancy\TenantContext;

final class EvaluationPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->currentMembership() !== null;
    }

    public function view(User $user, Evaluation $evaluation): bool
    {
        if ($evaluation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Subject o evaluator siempre ven
        if ($evaluation->subject_user_id === $user->id
            || $evaluation->evaluator_user_id === $user->id) {
            return true;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function create(User $user): bool
    {
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    public function evaluate(User $user, Evaluation $evaluation): bool
    {
        if ($evaluation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Evaluador asignado, o staff autorizado si aún no hay evaluador
        if ($evaluation->evaluator_user_id === $user->id) {
            return true;
        }
        if ($evaluation->evaluator_user_id === null) {
            return in_array($user->primaryRole(), [
                MembershipRole::TenantAdmin,
                MembershipRole::HR,
                MembershipRole::TeamLead,
                MembershipRole::Mentor,
            ], true);
        }
        return false;
    }

    public function acknowledge(User $user, Evaluation $evaluation): bool
    {
        return $evaluation->tenant_id === TenantContext::currentId()
            && $evaluation->subject_user_id === $user->id;
    }

    /**
     * Sólo el sujeto evaluado puede iniciar una disputa, y sólo cuando la
     * evaluación está en SUBMITTED (post-envío del evaluador, pre-cierre).
     */
    public function dispute(User $user, Evaluation $evaluation): bool
    {
        return $evaluation->tenant_id === TenantContext::currentId()
            && $evaluation->subject_user_id === $user->id;
    }

    /**
     * Cerrar disputa requiere autoridad — Admin o HR. TeamLead no puede
     * porque la disputa puede ser CONTRA el TeamLead (conflicto de interés).
     */
    public function resolve(User $user, Evaluation $evaluation): bool
    {
        if ($evaluation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
        ], true);
    }

    /**
     * Cancelar antes de enviar: Admin/HR/TeamLead. El evaluador asignado
     * también puede cancelar la suya (más rápido que pedir cancelación
     * formal).
     */
    public function cancel(User $user, Evaluation $evaluation): bool
    {
        if ($evaluation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        if ($evaluation->evaluator_user_id === $user->id) {
            return true;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }

    /**
     * Reasignar evaluador: mismos roles que pueden crear (Admin/HR/Lead).
     * No el Mentor — un mentor no debería poder reasignarse a sí mismo
     * o quitarse de evaluaciones que le toquen.
     */
    public function assign(User $user, Evaluation $evaluation): bool
    {
        if ($evaluation->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);
    }
}

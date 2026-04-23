<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Http\Policies;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Tracking\Domain\DailyReport;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

final class DailyReportPolicy
{
    public function view(User $user, DailyReport $report): bool
    {
        if ($report->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        // Self
        if ($report->user_id === $user->id) {
            return true;
        }
        $role = $user->primaryRole();
        // Admin/HR ven todo
        if (in_array($role, [MembershipRole::TenantAdmin, MembershipRole::HR], true)) {
            return true;
        }
        // Mentor: asignado al autor
        if ($role === MembershipRole::Mentor) {
            return DB::table('mentor_assignments')
                ->where('tenant_id', TenantContext::currentId())
                ->where('mentor_user_id', $user->id)
                ->where('intern_user_id', $report->user_id)
                ->where('status', 'active')
                ->exists();
        }
        // Team lead: el autor está en algún team que el lidera
        if ($role === MembershipRole::TeamLead) {
            return DB::table('teams')
                ->where('tenant_id', TenantContext::currentId())
                ->where('lead_user_id', $user->id)
                ->whereIn('id', function ($q) use ($report) {
                    $q->select('team_id')
                        ->from('team_memberships')
                        ->where('user_id', $report->user_id)
                        ->whereNull('left_at');
                })
                ->exists();
        }
        return false;
    }

    public function update(User $user, DailyReport $report): bool
    {
        return $report->user_id === $user->id
            && $report->tenant_id === TenantContext::currentId();
    }

    public function review(User $user, DailyReport $report): bool
    {
        if ($report->tenant_id !== TenantContext::currentId()) {
            return false;
        }
        if ($report->user_id === $user->id) {
            return false; // no review self
        }
        return in_array($user->primaryRole(), [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
            MembershipRole::Mentor,
        ], true);
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Organization\Domain\Events\TeamMembershipChanged;
use App\Modules\Organization\Domain\Team;
use App\Modules\Organization\Domain\TeamMembership;
use Illuminate\Support\Facades\DB;

final class AddTeamMemberHandler
{
    public function handle(AddTeamMember $command): TeamMembership
    {
        $team = Team::query()->findOrFail($command->teamId);

        return DB::transaction(function () use ($command, $team) {
            // Evitar duplicado activo: si ya existe active para ese (team, user, role), retornamos
            $existing = TeamMembership::query()
                ->where('team_id', $team->id)
                ->where('user_id', $command->userId)
                ->where('role', $command->role)
                ->whereNull('left_at')
                ->first();

            if ($existing) {
                return $existing;
            }

            $membership = TeamMembership::create([
                'team_id' => $team->id,
                'user_id' => $command->userId,
                'role' => $command->role,
                'joined_at' => now(),
            ]);

            DB::afterCommit(function () use ($membership, $command) {
                event(new TeamMembershipChanged($membership, 'added', $command->actor));
            });

            return $membership;
        });
    }
}

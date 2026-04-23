<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Organization\Domain\Area;
use App\Modules\Organization\Domain\Enums\TeamMembershipRole;
use App\Modules\Organization\Domain\Events\TeamCreated;
use App\Modules\Organization\Domain\Team;
use App\Modules\Organization\Domain\TeamMembership;
use Illuminate\Support\Facades\DB;

final class CreateTeamHandler
{
    public function handle(CreateTeam $command): Team
    {
        $area = Area::query()->findOrFail($command->areaId);

        return DB::transaction(function () use ($command, $area) {
            $team = Team::create([
                'area_id' => $area->id,
                'name' => $command->name,
                'slug' => $command->slug,
                'lead_user_id' => $command->leadUserId,
                'color' => $command->color ?? '#0891B2',
                'metadata' => $command->metadata,
                'created_by' => $command->actor->id,
                'updated_by' => $command->actor->id,
            ]);

            // Auto-inscribir al lead como miembro si se especificó
            if ($command->leadUserId) {
                TeamMembership::create([
                    'team_id' => $team->id,
                    'user_id' => $command->leadUserId,
                    'role' => TeamMembershipRole::Lead->value,
                    'joined_at' => now(),
                ]);
            }

            DB::afterCommit(function () use ($team, $command) {
                event(new TeamCreated($team, $command->actor));
            });

            return $team;
        });
    }
}

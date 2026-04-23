<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Organization\Domain\Events\TeamMembershipChanged;
use App\Modules\Organization\Domain\TeamMembership;
use Illuminate\Support\Facades\DB;

final class RemoveTeamMemberHandler
{
    public function handle(RemoveTeamMember $command): TeamMembership
    {
        $membership = TeamMembership::query()->findOrFail($command->membershipId);

        if (!$membership->isActive()) {
            return $membership;  // idempotente
        }

        DB::transaction(function () use ($membership, $command) {
            $membership->left_at = now();
            $membership->save();

            DB::afterCommit(function () use ($membership, $command) {
                event(new TeamMembershipChanged($membership, 'removed', $command->actor));
            });
        });

        return $membership->fresh();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\People\Domain\Enums\AssignmentStatus;
use App\Modules\People\Domain\Events\InternUnassignedFromMentor;
use App\Modules\People\Domain\MentorAssignment;
use Illuminate\Support\Facades\DB;

final class UnassignMentorHandler
{
    public function handle(UnassignMentor $command): MentorAssignment
    {
        /** @var MentorAssignment $assignment */
        $assignment = MentorAssignment::query()->findOrFail($command->assignmentId);

        if (!$assignment->isActive()) {
            return $assignment;
        }

        DB::transaction(function () use ($assignment, $command) {
            $assignment->status = AssignmentStatus::Ended;
            $assignment->ended_at = now();
            $assignment->save();

            DB::afterCommit(function () use ($assignment, $command) {
                event(new InternUnassignedFromMentor($assignment, $command->actor));
            });
        });

        return $assignment->fresh();
    }
}

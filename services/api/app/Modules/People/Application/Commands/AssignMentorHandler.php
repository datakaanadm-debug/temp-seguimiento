<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Enums\AssignmentStatus;
use App\Modules\People\Domain\Events\InternAssignedToMentor;
use App\Modules\People\Domain\Exceptions\MentorCapacityExceeded;
use App\Modules\People\Domain\MentorAssignment;
use App\Modules\People\Domain\MentorData;
use App\Modules\People\Domain\Profile;
use Illuminate\Support\Facades\DB;

/**
 * Asigna mentor a practicante. Si el practicante ya tenía mentor activo, lo termina primero
 * (sustitución) dentro de la misma transacción para respetar el unique partial de DB.
 *
 * Si el mentor alcanzó su `max_mentees`, lanza MentorCapacityExceeded.
 */
final class AssignMentorHandler
{
    public function handle(AssignMentor $command): MentorAssignment
    {
        return DB::transaction(function () use ($command) {
            // Validar capacidad del mentor
            $this->ensureMentorHasCapacity($command->mentorUserId);

            // Terminar asignación activa previa del practicante (si existe)
            MentorAssignment::query()
                ->where('intern_user_id', $command->internUserId)
                ->where('status', AssignmentStatus::Active->value)
                ->update([
                    'status' => AssignmentStatus::Ended->value,
                    'ended_at' => now(),
                    'updated_at' => now(),
                ]);

            $assignment = MentorAssignment::create([
                'mentor_user_id' => $command->mentorUserId,
                'intern_user_id' => $command->internUserId,
                'started_at' => now(),
                'status' => AssignmentStatus::Active->value,
                'notes' => $command->notes,
                'created_by' => $command->actor?->id,
            ]);

            DB::afterCommit(function () use ($assignment, $command) {
                event(new InternAssignedToMentor($assignment, $command->actor));
            });

            return $assignment;
        });
    }

    private function ensureMentorHasCapacity(string $mentorUserId): void
    {
        $mentorProfile = Profile::query()->where('user_id', $mentorUserId)->first();
        if (!$mentorProfile) {
            return; // sin profile: sin límite explícito
        }

        $mentorData = MentorData::query()->where('profile_id', $mentorProfile->id)->first();
        if (!$mentorData) {
            return;
        }

        $activeCount = MentorAssignment::query()
            ->where('mentor_user_id', $mentorUserId)
            ->where('status', AssignmentStatus::Active->value)
            ->count();

        if ($activeCount >= $mentorData->max_mentees) {
            /** @var User $user */
            $user = User::query()->find($mentorUserId);
            throw MentorCapacityExceeded::for($user?->name ?? 'Mentor', $mentorData->max_mentees);
        }
    }
}

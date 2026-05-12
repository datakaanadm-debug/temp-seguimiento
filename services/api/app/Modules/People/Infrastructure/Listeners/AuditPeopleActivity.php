<?php

declare(strict_types=1);

namespace App\Modules\People\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\People\Domain\Events\InternAssignedToMentor;
use App\Modules\People\Domain\Events\InternHired;
use App\Modules\People\Domain\Events\InternUnassignedFromMentor;
use App\Modules\People\Domain\MentorAssignment;
use App\Modules\People\Domain\Profile;
use Illuminate\Support\Facades\DB;

final class AuditPeopleActivity
{
    public function handle(InternAssignedToMentor|InternUnassignedFromMentor|InternHired $event): void
    {
        match (true) {
            $event instanceof InternAssignedToMentor => $this->logAssigned($event),
            $event instanceof InternUnassignedFromMentor => $this->logUnassigned($event),
            $event instanceof InternHired => $this->logHired($event),
        };
    }

    private function logAssigned(InternAssignedToMentor $e): void
    {
        $names = $this->resolveNames($e->assignment->mentor_user_id, $e->assignment->intern_user_id);
        ActivityLogger::record(
            tenantId: $e->assignment->tenant_id,
            logName: 'people',
            event: 'mentor_assigned',
            description: ($e->actor->name ?? 'Sistema') . ' asignó a ' . $names['mentor'] . ' como mentor de ' . $names['intern'],
            subjectType: MentorAssignment::class,
            subjectId: $e->assignment->id,
            causerId: $e->actor?->id,
            properties: [
                'mentor_user_id' => $e->assignment->mentor_user_id,
                'intern_user_id' => $e->assignment->intern_user_id,
            ],
        );
    }

    private function logUnassigned(InternUnassignedFromMentor $e): void
    {
        $names = $this->resolveNames($e->assignment->mentor_user_id, $e->assignment->intern_user_id);
        ActivityLogger::record(
            tenantId: $e->assignment->tenant_id,
            logName: 'people',
            event: 'mentor_unassigned',
            description: ($e->actor->name ?? 'Sistema') . ' desasignó a ' . $names['mentor'] . ' como mentor de ' . $names['intern'],
            subjectType: MentorAssignment::class,
            subjectId: $e->assignment->id,
            causerId: $e->actor?->id,
            properties: [
                'mentor_user_id' => $e->assignment->mentor_user_id,
                'intern_user_id' => $e->assignment->intern_user_id,
            ],
        );
    }

    private function logHired(InternHired $e): void
    {
        $internName = DB::table('users')->where('id', $e->profile->user_id)->value('name') ?? 'practicante';
        ActivityLogger::record(
            tenantId: $e->profile->tenant_id,
            logName: 'people',
            event: 'intern_hired',
            description: ($e->actor->name ?? 'RR.HH.') . ' contrató formalmente a ' . $internName,
            subjectType: Profile::class,
            subjectId: $e->profile->id,
            causerId: $e->actor?->id,
            properties: ['intern_user_id' => $e->profile->user_id],
        );
    }

    /** @return array{mentor:string,intern:string} */
    private function resolveNames(string $mentorId, string $internId): array
    {
        $rows = DB::table('users')
            ->whereIn('id', [$mentorId, $internId])
            ->pluck('name', 'id');
        return [
            'mentor' => $rows[$mentorId] ?? 'mentor',
            'intern' => $rows[$internId] ?? 'practicante',
        ];
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Identity\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\Identity\Domain\Events\UserActivated;
use App\Modules\Identity\Domain\Events\UserInvited;
use App\Modules\Identity\Domain\User;

final class AuditIdentityActivity
{
    public function handle(UserActivated|UserInvited $event): void
    {
        match (true) {
            $event instanceof UserActivated => $this->logActivated($event),
            $event instanceof UserInvited => $this->logInvited($event),
        };
    }

    private function logActivated(UserActivated $e): void
    {
        ActivityLogger::record(
            tenantId: $e->tenant->id,
            logName: 'identity',
            event: 'user_activated',
            description: ($e->user->name ?? $e->user->email) . ' se registró en el workspace',
            subjectType: User::class,
            subjectId: $e->user->id,
            causerId: $e->user->id,
            properties: ['email' => $e->user->email],
        );
    }

    private function logInvited(UserInvited $e): void
    {
        ActivityLogger::record(
            tenantId: $e->invitation->tenant_id,
            logName: 'identity',
            event: 'invitation_sent',
            description: ($e->actor->name ?? 'Alguien') . ' invitó a ' . $e->invitation->email,
            subjectType: \App\Modules\Identity\Domain\Invitation::class,
            subjectId: $e->invitation->id,
            causerId: $e->actor->id,
            properties: [
                'email' => $e->invitation->email,
                'role' => $e->invitation->role?->value ?? null,
            ],
        );
    }
}

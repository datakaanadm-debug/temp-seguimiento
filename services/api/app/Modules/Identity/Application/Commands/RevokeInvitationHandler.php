<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Domain\Exceptions\InvitationInvalid;
use App\Modules\Identity\Domain\Invitation;

final class RevokeInvitationHandler
{
    public function handle(RevokeInvitation $command): Invitation
    {
        /** @var Invitation $invitation */
        $invitation = Invitation::query()->findOrFail($command->invitationId);

        if ($invitation->accepted_at) {
            throw InvitationInvalid::alreadyAccepted();
        }
        if ($invitation->revoked_at) {
            return $invitation; // idempotente
        }

        $invitation->revoked_at = now();
        $invitation->save();

        return $invitation;
    }
}

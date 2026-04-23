<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Application\Services\InvitationTokenService;
use App\Modules\Identity\Domain\Events\UserInvited;
use App\Modules\Identity\Domain\Invitation;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;

/**
 * Crea una invitación activa. Si ya existe una pendiente para el mismo email en este tenant,
 * la invalida y crea una nueva (refresh-on-reinvite) para simplificar UX.
 *
 * @return array{invitation: Invitation, plain_token: string}
 */
final class InviteUserHandler
{
    public function __construct(
        private readonly InvitationTokenService $tokenService,
    ) {}

    public function handle(InviteUser $command): array
    {
        $tenantId = TenantContext::currentId();

        return DB::transaction(function () use ($command, $tenantId) {
            // Revocar cualquier invitación previa pendiente para el mismo email
            Invitation::query()
                ->where('tenant_id', $tenantId)
                ->where('email', $command->email)
                ->whereNull('accepted_at')
                ->whereNull('revoked_at')
                ->update([
                    'revoked_at' => now(),
                    'updated_at' => now(),
                ]);

            ['plain' => $plain, 'hash' => $hash] = $this->tokenService->generate();

            $invitation = new Invitation();
            $invitation->tenant_id = $tenantId;
            $invitation->email = strtolower($command->email);
            $invitation->token_hash = $hash;
            $invitation->role = $command->role;
            $invitation->team_id = $command->teamId;
            $invitation->mentor_id = $command->mentorId;
            $invitation->invited_by = $command->actor->id;
            $invitation->expires_at = now()->addHours($command->expiresInHours);
            $invitation->save();

            DB::afterCommit(function () use ($invitation, $command, $plain) {
                event(new UserInvited($invitation, $command->actor, $plain));
            });

            return [
                'invitation' => $invitation,
                'plain_token' => $plain,
            ];
        });
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Application\Services\InvitationTokenService;
use App\Modules\Identity\Domain\Enums\MembershipStatus;
use App\Modules\Identity\Domain\Events\UserActivated;
use App\Modules\Identity\Domain\Exceptions\InvitationInvalid;
use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\Tenant;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Acepta una invitación: crea el user si no existe, crea la membership, marca la invitación.
 *
 * Este handler corre SIN contexto de tenant previo (el aceptador no está logueado aún).
 * Resuelve el tenant desde la invitación misma.
 *
 * @return array{user: User, tenant: Tenant, membership: Membership}
 */
final class AcceptInvitationHandler
{
    public function __construct(
        private readonly InvitationTokenService $tokenService,
    ) {}

    public function handle(AcceptInvitation $command): array
    {
        $tokenHash = $this->tokenService->hash($command->plainToken);

        // Buscar la invitación por hash SIN global scope (tenant aún no resuelto)
        $invitation = Invitation::query()
            ->withoutGlobalScopes()
            ->where('token_hash', $tokenHash)
            ->first();

        if (!$invitation) {
            throw InvitationInvalid::tokenMismatch();
        }

        if ($invitation->accepted_at) {
            throw InvitationInvalid::alreadyAccepted();
        }
        if ($invitation->revoked_at) {
            throw InvitationInvalid::revoked();
        }
        if ($invitation->expires_at->isPast()) {
            throw InvitationInvalid::expired();
        }
        if (strtolower($invitation->email) !== strtolower($command->email)) {
            throw InvitationInvalid::emailMismatch();
        }

        $tenant = Tenant::query()
            ->withoutGlobalScopes()
            ->findOrFail($invitation->tenant_id);

        return DB::transaction(function () use ($command, $invitation, $tenant) {
            TenantContext::setCurrent($tenant);

            // Crear o reusar user
            $user = User::query()->where('email', $command->email)->first();
            if (!$user) {
                $user = new User();
                $user->email = $command->email;
                $user->name = $command->name;
                $user->password_hash = Hash::make($command->password);
                $user->email_verified_at = now(); // aceptar invitación valida el email
                $user->locale = $command->locale ?? 'es-MX';
                $user->timezone = $command->timezone ?? 'America/Mexico_City';
                $user->save();
            }

            // Crear la membership
            $membership = Membership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => $invitation->role,
                'status' => MembershipStatus::Active->value,
                'invited_by' => $invitation->invited_by,
                'joined_at' => now(),
            ]);

            // Marcar invitation aceptada
            $invitation->accepted_at = now();
            $invitation->accepted_by = $user->id;
            $invitation->save();

            DB::afterCommit(function () use ($user, $tenant) {
                event(new UserActivated($user, $tenant));
            });

            return [
                'user' => $user,
                'tenant' => $tenant,
                'membership' => $membership,
            ];
        });
    }
}

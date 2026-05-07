<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Application\Commands\AcceptInvitation;
use App\Modules\Identity\Application\Commands\AcceptInvitationHandler;
use App\Modules\Identity\Application\Commands\InviteUser;
use App\Modules\Identity\Application\Commands\InviteUserHandler;
use App\Modules\Identity\Application\Commands\RevokeInvitation;
use App\Modules\Identity\Application\Commands\RevokeInvitationHandler;
use App\Modules\Identity\Domain\Exceptions\InvitationInvalid;
use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Http\Requests\AcceptInvitationRequest;
use App\Modules\Identity\Http\Requests\InviteUserRequest;
use App\Modules\Identity\Http\Resources\InvitationResource;
use App\Modules\Identity\Http\Resources\TenantResource;
use App\Modules\Identity\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class InvitationController extends Controller
{
    public function __construct(
        private readonly InviteUserHandler $inviteHandler,
        private readonly AcceptInvitationHandler $acceptHandler,
        private readonly RevokeInvitationHandler $revokeHandler,
    ) {}

    /**
     * GET /api/v1/invitations
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Invitation::class);

        $query = Invitation::query()->with('invitedBy');

        if ($request->query('status') === 'pending') {
            $query->pending();
        }

        $items = $query->orderByDesc('created_at')->paginate(20);

        return response()->json([
            'data' => InvitationResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
            ],
        ]);
    }

    /**
     * POST /api/v1/invitations
     */
    public function store(InviteUserRequest $request): JsonResponse
    {
        ['invitation' => $invitation] = $this->inviteHandler->handle(new InviteUser(
            email: strtolower((string) $request->string('email')),
            role: (string) $request->string('role'),
            actor: $request->user(),
            teamId: $request->filled('team_id') ? (string) $request->string('team_id') : null,
            mentorId: $request->filled('mentor_id') ? (string) $request->string('mentor_id') : null,
            expiresInHours: (int) $request->integer('expires_in_hours', 72),
        ));

        return response()->json([
            'invitation' => InvitationResource::make($invitation->fresh('invitedBy'))->resolve(),
        ], 201);
    }

    /**
     * DELETE /api/v1/invitations/{invitation}
     */
    public function destroy(Invitation $invitation, Request $request): JsonResponse
    {
        $this->authorize('revoke', $invitation);

        $revoked = $this->revokeHandler->handle(new RevokeInvitation(
            invitationId: $invitation->id,
            actor: $request->user(),
        ));

        return response()->json([
            'invitation' => InvitationResource::make($revoked)->resolve(),
        ]);
    }

    /**
     * POST /api/v1/invitations/accept       (endpoint pre-auth)
     *
     * El tenant se resuelve desde el token, no desde subdomain. El middleware
     * ResolveTenant marca esta ruta como tenantless.
     */
    public function accept(AcceptInvitationRequest $request): JsonResponse
    {
        try {
            $result = $this->acceptHandler->handle(new AcceptInvitation(
                plainToken: (string) $request->string('token'),
                email: strtolower((string) $request->string('email')),
                name: (string) $request->string('name'),
                password: (string) $request->string('password'),
                timezone: $request->filled('timezone') ? (string) $request->string('timezone') : null,
                locale: $request->filled('locale') ? (string) $request->string('locale') : null,
            ));
        } catch (InvitationInvalid $e) {
            throw ValidationException::withMessages([
                'token' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'user' => UserResource::make($result['user'])->resolve(),
            'tenant' => TenantResource::make($result['tenant'])->resolve(),
            'message' => 'Account activated. You may now log in.',
        ], 201);
    }
}

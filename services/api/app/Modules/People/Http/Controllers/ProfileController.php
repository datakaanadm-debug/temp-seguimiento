<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Controllers;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\People\Application\Commands\UpdateProfile;
use App\Modules\People\Application\Commands\UpdateProfileHandler;
use App\Modules\People\Application\Commands\UpsertInternData;
use App\Modules\People\Application\Commands\UpsertInternDataHandler;
use App\Modules\People\Domain\Enums\ProfileKind;
use App\Modules\People\Domain\Events\InternHired;
use App\Modules\People\Domain\Profile;
use App\Modules\People\Http\Requests\UpdateProfileRequest;
use App\Modules\People\Http\Requests\UpsertInternDataRequest;
use App\Modules\People\Http\Resources\InternDataResource;
use App\Modules\People\Http\Resources\ProfileResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class ProfileController extends Controller
{
    public function __construct(
        private readonly UpdateProfileHandler $updateHandler,
        private readonly UpsertInternDataHandler $internHandler,
    ) {}

    /**
     * GET /api/v1/profiles        filter ?kind=intern|mentor
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Profile::class);

        // Eager-load `activeMembership` evita N+1 en ProfileResource — antes
        // hacía una query manual por cada profile para resolver el rol.
        $query = Profile::query()->with(['user', 'internData', 'mentorData', 'activeMembership']);

        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }
        if ($search = $request->query('q')) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%"));
        }

        // Filtro pragmático: ?can_mentor=true devuelve perfiles cuyos memberships
        // tienen role en (mentor, team_lead, hr, tenant_admin) — cualquiera que
        // en una organización real podría mentorear a un practicante.
        if ($request->boolean('can_mentor')) {
            $query->whereExists(function ($q) {
                $q->select(\DB::raw(1))
                    ->from('memberships as m')
                    ->whereColumn('m.user_id', 'profiles.user_id')
                    ->whereColumn('m.tenant_id', 'profiles.tenant_id')
                    ->where('m.status', 'active')
                    ->whereIn('m.role', ['mentor', 'team_lead', 'hr', 'tenant_admin']);
            });
        }

        // Respeta ?per_page del cliente (antes se ignoraba y siempre devolvía 20,
        // lo cual truncaba los pickers de assignee que piden per_page=100).
        $perPage = max(1, min(200, (int) $request->integer('per_page', 20)));
        $profiles = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'data' => ProfileResource::collection($profiles),
            'meta' => [
                'total' => $profiles->total(),
                'per_page' => $profiles->perPage(),
                'current_page' => $profiles->currentPage(),
                'last_page' => $profiles->lastPage(),
            ],
        ]);
    }

    /**
     * GET /api/v1/profiles/{profile}
     */
    public function show(Profile $profile): JsonResponse
    {
        $this->authorize('view', $profile);
        $profile->load(['user', 'internData', 'mentorData', 'activeMembership']);

        return response()->json([
            'data' => ProfileResource::make($profile)->resolve(),
        ]);
    }

    /**
     * GET /api/v1/profiles/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        $profile = Profile::query()
            ->where('user_id', $user->id)
            ->with(['user', 'internData', 'mentorData'])
            ->firstOrFail();

        return response()->json([
            'data' => ProfileResource::make($profile)->resolve(),
        ]);
    }

    /**
     * PATCH /api/v1/profiles/{profile}
     */
    public function update(Profile $profile, UpdateProfileRequest $request): JsonResponse
    {
        $this->authorize('update', $profile);

        // Cambio de `kind` requiere privilegio mayor
        if ($request->has('kind') && $request->input('kind') !== $profile->kind->value) {
            $this->authorize('updateSensitive', $profile);
        }

        $updated = $this->updateHandler->handle(new UpdateProfile(
            profileId: $profile->id,
            actor: $request->user(),
            fields: $request->validated(),
        ));

        return response()->json([
            'data' => ProfileResource::make($updated->load(['user', 'internData', 'mentorData']))->resolve(),
        ]);
    }

    /**
     * POST /api/v1/profiles/{profile}/mark-hired
     *
     * Marca al practicante como contratado (graduado del programa, ahora empleado).
     * Solo staff (admin/HR/team_lead). Idempotente: si ya estaba marcado,
     * conserva el `hired_at` original. Dispara `InternHired` (otorga
     * `legacy-intern` en gamification).
     */
    public function markHired(Profile $profile, Request $request): JsonResponse
    {
        $actor = $request->user();
        $role = $actor->primaryRole();
        $allowed = in_array($role, [
            MembershipRole::TenantAdmin,
            MembershipRole::HR,
            MembershipRole::TeamLead,
        ], true);

        if (!$allowed) {
            abort(403, 'Solo staff puede marcar a un practicante como contratado.');
        }

        if ($profile->kind !== ProfileKind::Intern) {
            abort(422, 'Solo se puede marcar como contratado a un practicante.');
        }

        $isFirstTime = $profile->hired_at === null;

        if ($isFirstTime) {
            $profile->hired_at = now();
            $profile->save();
            event(new InternHired($profile->fresh(), $actor));
        }

        return response()->json([
            'data' => ProfileResource::make(
                $profile->fresh()->load(['user', 'internData', 'mentorData']),
            )->resolve(),
            'meta' => ['was_first_time' => $isFirstTime],
        ]);
    }

    /**
     * PUT /api/v1/profiles/{profile}/intern-data
     */
    public function upsertInternData(Profile $profile, UpsertInternDataRequest $request): JsonResponse
    {
        $this->authorize('update', $profile);

        $data = $this->internHandler->handle(new UpsertInternData(
            profileId: $profile->id,
            actor: $request->user(),
            fields: $request->validated(),
        ));

        return response()->json([
            'data' => InternDataResource::make($data)->resolve(),
        ]);
    }
}

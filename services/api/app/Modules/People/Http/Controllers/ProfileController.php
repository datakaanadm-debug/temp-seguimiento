<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Controllers;

use App\Modules\People\Application\Commands\UpdateProfile;
use App\Modules\People\Application\Commands\UpdateProfileHandler;
use App\Modules\People\Application\Commands\UpsertInternData;
use App\Modules\People\Application\Commands\UpsertInternDataHandler;
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

        $query = Profile::query()->with(['user', 'internData', 'mentorData']);

        if ($kind = $request->query('kind')) {
            $query->where('kind', $kind);
        }
        if ($search = $request->query('q')) {
            $query->whereHas('user', fn ($q) => $q->where('name', 'ilike', "%{$search}%")
                ->orWhere('email', 'ilike', "%{$search}%"));
        }

        $profiles = $query->orderBy('created_at', 'desc')->paginate(20);

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
        $profile->load(['user', 'internData', 'mentorData']);

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

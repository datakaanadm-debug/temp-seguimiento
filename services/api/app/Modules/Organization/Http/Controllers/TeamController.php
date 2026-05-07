<?php

declare(strict_types=1);

namespace App\Modules\Organization\Http\Controllers;

use App\Modules\Organization\Application\Commands\AddTeamMember;
use App\Modules\Organization\Application\Commands\AddTeamMemberHandler;
use App\Modules\Organization\Application\Commands\CreateTeam;
use App\Modules\Organization\Application\Commands\CreateTeamHandler;
use App\Modules\Organization\Application\Commands\RemoveTeamMember;
use App\Modules\Organization\Application\Commands\RemoveTeamMemberHandler;
use App\Modules\Organization\Domain\Team;
use App\Modules\Organization\Domain\TeamMembership;
use App\Modules\Organization\Http\Requests\AddTeamMemberRequest;
use App\Modules\Organization\Http\Requests\CreateTeamRequest;
use App\Modules\Organization\Http\Resources\TeamMembershipResource;
use App\Modules\Organization\Http\Resources\TeamResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class TeamController extends Controller
{
    public function __construct(
        private readonly CreateTeamHandler $createHandler,
        private readonly AddTeamMemberHandler $addMemberHandler,
        private readonly RemoveTeamMemberHandler $removeMemberHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Team::class);

        $query = Team::query()->with('lead')->withCount('memberships')->orderBy('name');

        if ($areaId = $request->query('area_id')) {
            $query->where('area_id', $areaId);
        }

        return response()->json([
            'data' => TeamResource::collection($query->get()),
        ]);
    }

    public function show(Team $team): JsonResponse
    {
        $this->authorize('view', $team);
        $team->load(['lead'])->loadCount('memberships');

        return response()->json([
            'data' => TeamResource::make($team)->resolve(),
        ]);
    }

    public function store(CreateTeamRequest $request): JsonResponse
    {
        $team = $this->createHandler->handle(new CreateTeam(
            areaId: (string) $request->string('area_id'),
            name: (string) $request->string('name'),
            slug: strtolower((string) $request->string('slug')),
            actor: $request->user(),
            leadUserId: $request->filled('lead_user_id') ? (string) $request->string('lead_user_id') : null,
            color: $request->filled('color') ? (string) $request->string('color') : null,
            metadata: (array) $request->input('metadata', []),
        ));

        return response()->json([
            'data' => TeamResource::make($team->fresh('lead'))->resolve(),
        ], 201);
    }

    public function update(Team $team, Request $request): JsonResponse
    {
        $this->authorize('update', $team);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:150'],
            'lead_user_id' => ['sometimes', 'nullable', 'uuid', 'exists:users,id'],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'metadata' => ['sometimes', 'array'],
        ]);

        $team->fill($validated);
        $team->updated_by = $request->user()->id;
        $team->save();

        return response()->json([
            'data' => TeamResource::make($team->fresh('lead'))->resolve(),
        ]);
    }

    public function destroy(Team $team, Request $request): JsonResponse
    {
        $this->authorize('delete', $team);
        $team->delete();

        return response()->json(['ok' => true]);
    }

    // ── Members ────────────────────────────────────────────────────────

    public function members(Team $team, Request $request): JsonResponse
    {
        $this->authorize('view', $team);

        $members = TeamMembership::query()
            ->where('team_id', $team->id)
            ->whereNull('left_at')
            ->with('user')
            ->orderBy('joined_at')
            ->get();

        return response()->json([
            'data' => TeamMembershipResource::collection($members),
        ]);
    }

    public function addMember(Team $team, AddTeamMemberRequest $request): JsonResponse
    {
        $this->authorize('manageMembers', $team);

        $membership = $this->addMemberHandler->handle(new AddTeamMember(
            teamId: $team->id,
            userId: (string) $request->string('user_id'),
            role: (string) $request->string('role'),
            actor: $request->user(),
        ));

        return response()->json([
            'data' => TeamMembershipResource::make($membership->fresh('user'))->resolve(),
        ], 201);
    }

    public function removeMember(Team $team, TeamMembership $membership, Request $request): JsonResponse
    {
        $this->authorize('manageMembers', $team);

        abort_if($membership->team_id !== $team->id, 404);

        $this->removeMemberHandler->handle(new RemoveTeamMember(
            membershipId: $membership->id,
            actor: $request->user(),
        ));

        return response()->json(['ok' => true]);
    }
}

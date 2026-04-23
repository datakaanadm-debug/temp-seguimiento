<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Controllers;

use App\Modules\Notifications\Application\Commands\UpsertPreferences;
use App\Modules\Notifications\Application\Commands\UpsertPreferencesHandler;
use App\Modules\Notifications\Domain\NotificationPreference;
use App\Modules\Notifications\Http\Requests\UpsertPreferencesRequest;
use App\Modules\Notifications\Http\Resources\NotificationPreferenceResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;

final class NotificationPreferenceController extends Controller
{
    public function __construct(
        private readonly UpsertPreferencesHandler $upsertHandler,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $prefs = NotificationPreference::query()
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json([
            'data' => NotificationPreferenceResource::collection($prefs),
        ]);
    }

    public function upsert(UpsertPreferencesRequest $request): JsonResponse
    {
        $this->upsertHandler->handle(new UpsertPreferences(
            user: $request->user(),
            preferences: (array) $request->input('preferences', []),
        ));

        $prefs = NotificationPreference::query()
            ->where('user_id', $request->user()->id)
            ->get();

        return response()->json([
            'data' => NotificationPreferenceResource::collection($prefs),
        ]);
    }
}

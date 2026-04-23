<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Http\Controllers;

use App\Modules\Notifications\Http\Resources\NotificationResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use App\Http\Controllers\Controller;

final class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = $request->user()->notifications()->getQuery();

        if ($request->boolean('unread')) {
            $query->whereNull('read_at');
        }

        $items = $query->orderByDesc('created_at')
            ->paginate((int) $request->integer('per_page', 30));

        return response()->json([
            'data' => NotificationResource::collection($items),
            'meta' => [
                'total' => $items->total(),
                'per_page' => $items->perPage(),
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'unread_count' => $request->user()->unreadNotifications()->count(),
            ],
        ]);
    }

    public function unreadCount(Request $request): JsonResponse
    {
        return response()->json([
            'unread_count' => $request->user()->unreadNotifications()->count(),
        ]);
    }

    public function markRead(string $id, Request $request): JsonResponse
    {
        /** @var ?DatabaseNotification $notification */
        $notification = $request->user()->notifications()->where('id', $id)->first();
        if (!$notification) {
            abort(404);
        }
        $notification->markAsRead();

        return response()->json([
            'data' => NotificationResource::make($notification)->resolve(),
        ]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $count = $request->user()->unreadNotifications->markAsRead();

        return response()->json([
            'marked_read' => (int) $count,
        ]);
    }

    public function destroy(string $id, Request $request): JsonResponse
    {
        $deleted = $request->user()->notifications()->where('id', $id)->delete();
        return response()->json(['deleted' => (int) $deleted]);
    }
}

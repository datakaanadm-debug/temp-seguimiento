<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Presencia ligera sin WebSocket.
 *
 * Cada cliente hace POST /presence/heartbeat cada ~20s con la ruta actual.
 * El backend guarda { user_id → last_seen_unix } por (tenant, path) con TTL 60s.
 * GET /presence devuelve los peers activos (últimos 60s) excluyendo al caller.
 *
 * Cuando en prod se active Reverb con presence channels, este endpoint puede
 * reemplazarse por suscripción WebSocket sin romper la API pública.
 */
final class PresenceController extends Controller
{
    private const TTL_SECONDS = 60;

    public function heartbeat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:200'],
        ]);

        $this->touch($data['path'], $request->user()->id);

        return response()->json(['ok' => true]);
    }

    public function peers(Request $request): JsonResponse
    {
        $data = $request->validate([
            'path' => ['required', 'string', 'max:200'],
        ]);

        $me = $request->user()->id;
        $key = $this->cacheKey($data['path']);

        /** @var array<string, int> $entries */
        $entries = Cache::get($key, []);
        $now = time();
        // Filtra expirados + a mí mismo
        $active = array_filter(
            $entries,
            fn ($ts, $uid) => $uid !== $me && ($now - (int) $ts) < self::TTL_SECONDS,
            ARRAY_FILTER_USE_BOTH,
        );

        if (empty($active)) {
            return response()->json(['data' => []]);
        }

        // Carga info mínima de users
        $users = DB::table('users')
            ->whereIn('id', array_keys($active))
            ->select('id', 'name', 'email')
            ->get()
            ->keyBy('id');

        $peers = [];
        foreach ($active as $uid => $ts) {
            $u = $users->get($uid);
            if (!$u) continue;
            $peers[] = [
                'user_id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'last_seen_at' => (int) $ts,
            ];
        }

        return response()->json(['data' => $peers]);
    }

    private function touch(string $path, string $userId): void
    {
        $key = $this->cacheKey($path);
        $entries = Cache::get($key, []);
        $entries[$userId] = time();

        // Limpia entradas expiradas para que el set no crezca indefinidamente
        $cutoff = time() - self::TTL_SECONDS;
        foreach ($entries as $uid => $ts) {
            if ($ts < $cutoff) {
                unset($entries[$uid]);
            }
        }

        Cache::put($key, $entries, self::TTL_SECONDS * 2);
    }

    private function cacheKey(string $path): string
    {
        // Normaliza path: /tareas, /tareas/abc-123 → /tareas (agrupa por sección)
        $segment = '/' . explode('/', trim($path, '/'))[0];
        return sprintf('presence:%s:%s', TenantContext::currentId(), $segment);
    }
}

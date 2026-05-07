<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application;

use App\Modules\Gamification\Domain\Badge;
use App\Modules\Gamification\Domain\UserBadge;
use App\Modules\Gamification\Domain\UserPoints;
use App\Shared\Support\Uuid;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Engine central de gamificación. Todos los listeners llaman a este servicio
 * en lugar de tocar `user_points` / `user_badges` directamente.
 *
 * Método atómico = una operación sobre uno de los contadores. Los listeners
 * componen estos métodos según la regla de cada badge.
 *
 * Reglas de tenancy:
 *   - El tenant se resuelve siempre desde TenantContext (RLS).
 *   - Si no hay tenant en contexto (eventos de jobs), usar `withTenant()`.
 *
 * Niveles automáticos por puntos:
 *   - Junior:   0 - 99
 *   - Mid:    100 - 249
 *   - Senior: 250 - 499
 *   - Lead:   500+
 */
final class GamificationService
{
    public function __construct(private readonly RecentAwardsCollector $collector) {}

    /**
     * Suma puntos al usuario y recomputa nivel.
     */
    public function awardPoints(string $userId, int $points): void
    {
        if ($points <= 0) {
            return;
        }
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return;
        }

        $row = UserPoints::firstOrCreate(
            ['user_id' => $userId, 'tenant_id' => $tenantId],
            ['total_points' => 0, 'streak_days' => 0, 'best_streak' => 0, 'level' => 'Junior'],
        );

        $row->total_points = (int) $row->total_points + $points;
        $row->level = $this->levelFor($row->total_points);
        $row->save();
    }

    /**
     * Otorga una badge si aún no la tiene. Devuelve true si fue nueva.
     * Si la badge no existe en el catálogo (por slug) lo loggea y devuelve false.
     */
    public function awardBadge(string $userId, string $slug): bool
    {
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return false;
        }

        $badge = Badge::withoutGlobalScopes()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->first();

        if (!$badge) {
            Log::warning("Gamification: badge '{$slug}' no existe en catálogo");
            return false;
        }

        // Idempotente: si ya está earned, no hace nada.
        $existing = UserBadge::where('user_id', $userId)
            ->where('badge_id', $badge->id)
            ->first();

        if ($existing && $existing->earned_at) {
            return false;
        }

        if ($existing) {
            $existing->progress_percent = 100;
            $existing->earned_at = now();
            $existing->save();
        } else {
            UserBadge::create([
                'id' => Uuid::v7(),
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'badge_id' => $badge->id,
                'progress_percent' => 100,
                'earned_at' => now(),
                'created_at' => now(),
            ]);
        }

        // Suma los puntos asociados a la badge
        $this->awardPoints($userId, (int) $badge->points);

        // Registra para que el middleware AppendRecentAwards lo inyecte
        // en el response JSON y el frontend muestre toast + invalide queries.
        $this->collector->add($badge, $userId);
        return true;
    }

    /**
     * Actualiza el progreso visible de una badge (sin desbloquearla).
     * Útil para mostrar la barra "45%" en /logros mientras el usuario avanza.
     */
    public function updateProgress(string $userId, string $slug, int $percent): void
    {
        $percent = max(0, min(99, $percent)); // 100 lo reserva awardBadge
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return;
        }

        $badge = Badge::withoutGlobalScopes()
            ->where('slug', $slug)
            ->where('is_active', true)
            ->where(function ($q) use ($tenantId) {
                $q->whereNull('tenant_id')->orWhere('tenant_id', $tenantId);
            })
            ->first();

        if (!$badge) {
            return;
        }

        $existing = UserBadge::where('user_id', $userId)
            ->where('badge_id', $badge->id)
            ->first();

        if ($existing && $existing->earned_at) {
            return; // ya ganada
        }

        if ($existing) {
            if ($existing->progress_percent < $percent) {
                $existing->progress_percent = $percent;
                $existing->save();
            }
        } else {
            UserBadge::create([
                'id' => Uuid::v7(),
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'badge_id' => $badge->id,
                'progress_percent' => $percent,
                'earned_at' => null,
                'created_at' => now(),
            ]);
        }
    }

    /**
     * Registra actividad del día. Si el usuario reportó ayer, suma 1 al streak.
     * Si no reportó ayer pero sí hoy, reinicia a 1. Si ya reportó hoy, no-op.
     * Devuelve el streak actualizado.
     */
    public function recordActivity(string $userId): int
    {
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return 0;
        }

        return DB::transaction(function () use ($userId, $tenantId) {
            $row = UserPoints::firstOrCreate(
                ['user_id' => $userId, 'tenant_id' => $tenantId],
                ['total_points' => 0, 'streak_days' => 0, 'best_streak' => 0, 'level' => 'Junior'],
            );

            $today = now()->toDateString();
            $last = $row->last_activity_date?->toDateString();

            if ($last === $today) {
                return (int) $row->streak_days; // ya contada
            }

            $yesterday = now()->subDay()->toDateString();
            if ($last === $yesterday) {
                $row->streak_days = (int) $row->streak_days + 1;
            } else {
                $row->streak_days = 1;
            }

            if ((int) $row->streak_days > (int) $row->best_streak) {
                $row->best_streak = (int) $row->streak_days;
            }

            $row->last_activity_date = $today;
            $row->save();

            return (int) $row->streak_days;
        });
    }

    /**
     * Lee el contador interno guardado en `user_points.metadata` (JSONB).
     * Usado para counters acumulativos (#comentarios, #tareas under-estimate).
     */
    public function getCounter(string $userId, string $key): int
    {
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return 0;
        }

        $val = DB::table('user_points')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->value('metadata');

        if (!$val) return 0;
        $data = is_string($val) ? (json_decode($val, true) ?: []) : (array) $val;
        return (int) ($data[$key] ?? 0);
    }

    /**
     * Incrementa un counter en metadata. Devuelve el nuevo valor.
     * NOTA: requiere columna `user_points.metadata` jsonb. Si no existe,
     * la migración correspondiente la añade.
     */
    public function incrementCounter(string $userId, string $key, int $by = 1): int
    {
        $tenantId = $this->tenantId();
        if (!$tenantId) {
            return 0;
        }

        return DB::transaction(function () use ($userId, $tenantId, $key, $by) {
            $row = UserPoints::firstOrCreate(
                ['user_id' => $userId, 'tenant_id' => $tenantId],
                ['total_points' => 0, 'streak_days' => 0, 'best_streak' => 0, 'level' => 'Junior'],
            );

            $meta = is_array($row->metadata ?? null) ? $row->metadata : [];
            $meta[$key] = (int) ($meta[$key] ?? 0) + $by;
            $row->metadata = $meta;
            $row->save();

            return (int) $meta[$key];
        });
    }

    private function levelFor(int $points): string
    {
        return match (true) {
            $points >= 500 => 'Lead',
            $points >= 250 => 'Senior',
            $points >= 100 => 'Mid',
            default => 'Junior',
        };
    }

    private function tenantId(): ?string
    {
        return TenantContext::has() ? TenantContext::currentId() : null;
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application;

use App\Modules\Gamification\Domain\Badge;

/**
 * Recolector scoped-al-request de badges otorgadas durante este HTTP cycle.
 *
 * GamificationService::awardBadge() llama `add()` cada vez que otorga una
 * badge nueva (no idempotente, sólo cuando es realmente una nueva). El
 * middleware AppendRecentAwards lee este collector justo antes de devolver
 * el response y agrega el array al JSON bajo la clave `_awarded_badges`.
 *
 * El frontend intercepta esa clave en api-client y dispara un toast +
 * invalida las queries de gamification para que la UI refleje el cambio.
 *
 * Scoped binding: una instancia POR REQUEST (configurado en
 * AppServiceProvider::register). Limpio entre requests.
 */
final class RecentAwardsCollector
{
    /** @var list<array{slug:string,name:string,description:string,icon:string,tier:string,points:int,user_id:string}> */
    private array $awards = [];

    public function add(Badge $badge, string $userId): void
    {
        $this->awards[] = [
            'slug' => $badge->slug,
            'name' => $badge->name,
            'description' => $badge->description,
            'icon' => $badge->icon,
            'tier' => $badge->tier,
            'points' => (int) $badge->points,
            'user_id' => $userId,
        ];
    }

    /** @return list<array<string,mixed>> */
    public function all(): array
    {
        return $this->awards;
    }

    public function isEmpty(): bool
    {
        return count($this->awards) === 0;
    }

    public function reset(): void
    {
        $this->awards = [];
    }
}

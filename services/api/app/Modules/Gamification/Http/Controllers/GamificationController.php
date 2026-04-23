<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Gamification\Domain\Badge;
use App\Modules\Gamification\Domain\UserBadge;
use App\Modules\Gamification\Domain\UserPoints;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GamificationController extends Controller
{
    public function badges(Request $request): JsonResponse
    {
        $all = Badge::where(function ($q) {
            $q->whereNull('tenant_id')
                ->orWhere('tenant_id', TenantContext::currentId());
        })->where('is_active', true)->get();

        return response()->json([
            'data' => $all->map(fn (Badge $b) => [
                'id' => $b->id,
                'slug' => $b->slug,
                'name' => $b->name,
                'description' => $b->description,
                'icon' => $b->icon,
                'tier' => $b->tier,
                'points' => (int) $b->points,
                'kind' => $b->kind,
            ])->all(),
        ]);
    }

    public function myBadges(Request $request): JsonResponse
    {
        $userId = $request->query('user_id') ?: $request->user()->id;

        $userBadges = UserBadge::with('badge')
            ->where('user_id', $userId)
            ->get();

        return response()->json([
            'data' => $userBadges->map(fn ($ub) => [
                'id' => $ub->id,
                'badge_id' => $ub->badge_id,
                'badge' => $ub->badge ? [
                    'id' => $ub->badge->id,
                    'name' => $ub->badge->name,
                    'description' => $ub->badge->description,
                    'icon' => $ub->badge->icon,
                    'tier' => $ub->badge->tier,
                ] : null,
                'progress_percent' => (int) $ub->progress_percent,
                'earned' => $ub->earned_at !== null,
                'earned_at' => $ub->earned_at?->toIso8601String(),
            ])->all(),
        ]);
    }

    public function leaderboard(Request $request): JsonResponse
    {
        $rows = DB::table('user_points as up')
            ->join('users as u', 'u.id', '=', 'up.user_id')
            ->leftJoin('profiles as p', 'p.user_id', '=', 'up.user_id')
            ->where('up.tenant_id', TenantContext::currentId())
            ->where(function ($q) {
                $q->whereNull('p.kind')->orWhere('p.kind', 'intern');
            })
            ->orderBy('up.total_points', 'desc')
            ->limit(20)
            ->select(
                'up.user_id', 'up.total_points', 'up.streak_days',
                'up.level', 'u.name', 'u.email', 'p.position_title',
            )
            ->get();

        $badgeCounts = DB::table('user_badges')
            ->whereNotNull('earned_at')
            ->where('tenant_id', TenantContext::currentId())
            ->groupBy('user_id')
            ->select('user_id', DB::raw('COUNT(*) as badge_count'))
            ->pluck('badge_count', 'user_id');

        return response()->json([
            'data' => $rows->map(fn ($r) => [
                'user_id' => $r->user_id,
                'name' => $r->name,
                'email' => $r->email,
                'area' => $r->position_title,
                'total_points' => (int) $r->total_points,
                'streak_days' => (int) $r->streak_days,
                'level' => $r->level,
                'badge_count' => (int) ($badgeCounts[$r->user_id] ?? 0),
            ])->all(),
        ]);
    }

    public function wall(Request $request): JsonResponse
    {
        $recent = DB::table('user_badges as ub')
            ->join('badges as b', 'b.id', '=', 'ub.badge_id')
            ->join('users as u', 'u.id', '=', 'ub.user_id')
            ->where('ub.tenant_id', TenantContext::currentId())
            ->whereNotNull('ub.earned_at')
            ->orderBy('ub.earned_at', 'desc')
            ->limit(12)
            ->select(
                'ub.id', 'ub.earned_at',
                'u.id as user_id', 'u.name',
                'b.name as badge_name', 'b.tier as badge_tier', 'b.icon',
            )
            ->get();

        return response()->json([
            'data' => $recent->map(fn ($r) => [
                'id' => $r->id,
                'user_id' => $r->user_id,
                'user_name' => $r->name,
                'badge_name' => $r->badge_name,
                'badge_tier' => $r->badge_tier,
                'badge_icon' => $r->icon,
                'earned_at' => $r->earned_at,
            ])->all(),
        ]);
    }

    public function myStats(Request $request): JsonResponse
    {
        $userId = $request->query('user_id') ?: $request->user()->id;

        $p = UserPoints::where('user_id', $userId)->first();
        $earned = UserBadge::where('user_id', $userId)->whereNotNull('earned_at')->count();
        $inProgress = UserBadge::where('user_id', $userId)
            ->whereNull('earned_at')
            ->where('progress_percent', '>', 0)->count();

        $leaderboardPos = DB::table('user_points as up')
            ->where('up.tenant_id', TenantContext::currentId())
            ->where('up.total_points', '>', $p?->total_points ?? 0)
            ->count() + 1;

        return response()->json([
            'data' => [
                'level' => $p?->level ?? 'Junior',
                'total_points' => (int) ($p?->total_points ?? 0),
                'streak_days' => (int) ($p?->streak_days ?? 0),
                'best_streak' => (int) ($p?->best_streak ?? 0),
                'earned_badges' => $earned,
                'in_progress_badges' => $inProgress,
                'leaderboard_position' => $leaderboardPos,
            ],
        ]);
    }
}

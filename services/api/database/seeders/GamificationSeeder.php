<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Gamification\Domain\Badge;
use App\Modules\Gamification\Domain\UserBadge;
use App\Modules\Gamification\Domain\UserPoints;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class GamificationSeeder extends Seeder
{
    public function run(): void
    {
        // Badges globales (tenant_id = null, visible a todos los tenants)
        $globalBadges = [
            ['first-day', 'Primer día', 'Completaste tu onboarding inicial.', 'Onboard', 'bronze', 20],
            ['punctual-7', 'Puntualidad 7 días', '7 días consecutivos reportando a tiempo.', 'Clock', 'silver', 50],
            ['punctual-30', 'Puntualidad 30 días', '30 días consecutivos con bitácora al día.', 'Clock', 'gold', 150],
            ['first-project', 'Primer proyecto', 'Entregaste tu primer proyecto completo.', 'Check', 'silver', 75],
            ['exemplary-feedback', 'Feedback ejemplar', 'Feedback sobresaliente en evaluación 30d.', 'Sparkles', 'gold', 120],
            ['mentor-cert', 'Mentor certificado', 'Ayudaste a onboardear a un practicante nuevo.', 'Mentor', 'gold', 200],
            ['master-collab', 'Master collaborator', '50+ comentarios constructivos en tareas.', 'People', 'silver', 80],
            ['okr-master', 'OKR master', 'Completaste todos los OKRs de un trimestre.', 'Flag', 'platinum', 300],
            ['streak-90', 'Racha 90 días', '90 días con actividad continua.', 'Cal', 'platinum', 400],
            ['zero-blocks', 'Zero bloqueos', 'Un mes sin reportar bloqueos.', 'Check', 'gold', 100],
            ['speed-runner', 'Speed runner', '10 tareas completadas por debajo de su estimado.', 'Sparkles', 'silver', 60],
            ['legacy-intern', 'Legacy intern', 'Completaste tu programa y fuiste contratado.', 'Eval', 'platinum', 500],
        ];

        // Sin set_config tenant_id porque son globales (tenant_id=null)
        // Necesitamos saltar el RLS para globales — usamos la tabla directamente
        DB::statement("SET session_replication_role = 'replica'"); // bypass triggers/RLS si hay

        foreach ($globalBadges as [$slug, $name, $desc, $icon, $tier, $points]) {
            Badge::withoutGlobalScopes()->updateOrCreate(
                ['slug' => $slug, 'tenant_id' => null],
                [
                    'name' => $name,
                    'description' => $desc,
                    'icon' => $icon,
                    'tier' => $tier,
                    'points' => $points,
                    'kind' => 'achievement',
                    'is_active' => true,
                ],
            );
        }
        DB::statement("SET session_replication_role = 'origin'");

        $badges = Badge::withoutGlobalScopes()->whereNull('tenant_id')->get();

        // Por cada tenant, asigna badges y puntos a los interns existentes
        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            $interns = DB::table('users as u')
                ->join('profiles as p', 'p.user_id', '=', 'u.id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.kind', 'intern')
                ->select('u.id', 'u.name')
                ->get();

            foreach ($interns as $i => $intern) {
                // Cada intern obtiene entre 4 y 8 badges random
                $earnedCount = random_int(4, 8);
                $shuffled = $badges->shuffle()->values();
                $totalPoints = 0;
                for ($j = 0; $j < $earnedCount; $j++) {
                    $badge = $shuffled[$j];
                    UserBadge::create([
                        'tenant_id' => $tenant->id,
                        'user_id' => $intern->id,
                        'badge_id' => $badge->id,
                        'progress_percent' => 100,
                        'earned_at' => now()->subDays(random_int(1, 60)),
                    ]);
                    $totalPoints += $badge->points;
                }
                // Y 2-3 badges en progreso (no earned)
                for ($j = $earnedCount; $j < $earnedCount + 3; $j++) {
                    if (!isset($shuffled[$j])) break;
                    $badge = $shuffled[$j];
                    UserBadge::create([
                        'tenant_id' => $tenant->id,
                        'user_id' => $intern->id,
                        'badge_id' => $badge->id,
                        'progress_percent' => random_int(10, 80),
                        'earned_at' => null,
                    ]);
                }

                $streak = random_int(0, 28);
                $levels = ['Junior', 'Mid', 'Senior', 'Lead'];
                $level = $totalPoints >= 400 ? $levels[3] : ($totalPoints >= 250 ? $levels[2] : ($totalPoints >= 100 ? $levels[1] : $levels[0]));

                UserPoints::updateOrCreate(
                    ['user_id' => $intern->id],
                    [
                        'tenant_id' => $tenant->id,
                        'total_points' => $totalPoints,
                        'streak_days' => $streak,
                        'best_streak' => max($streak, random_int($streak, 45)),
                        'last_activity_date' => now()->subDay(),
                        'level' => $level,
                    ],
                );
            }

            $this->command?->info("✓ Gamification seeded for tenant {$tenant->slug} ({$interns->count()} interns)");
        }
    }
}

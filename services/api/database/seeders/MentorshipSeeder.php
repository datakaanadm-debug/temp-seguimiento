<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Modules\Mentorship\Domain\GrowthGoal;
use App\Modules\Mentorship\Domain\GrowthSkill;
use App\Modules\Mentorship\Domain\MentorNote;
use App\Modules\Mentorship\Domain\MentorSession;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Seeder para el módulo Mentorship. Lee los tenants y usuarios existentes
 * y genera sesiones 1:1, notas y growth path realistas.
 */
class MentorshipSeeder extends Seeder
{
    public function run(): void
    {
        // Para cada tenant, resuelve mentor y practicantes del tenant y genera data.
        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {
            DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenant->id]);

            // Mentores: users con profile kind = mentor
            $mentors = DB::table('users as u')
                ->join('profiles as p', 'p.user_id', '=', 'u.id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.kind', 'mentor')
                ->select('u.id', 'u.name', 'u.email')
                ->get();

            $interns = DB::table('users as u')
                ->join('profiles as p', 'p.user_id', '=', 'u.id')
                ->where('p.tenant_id', $tenant->id)
                ->where('p.kind', 'intern')
                ->select('u.id', 'u.name', 'u.email')
                ->get();

            if ($mentors->isEmpty() || $interns->isEmpty()) {
                $this->command?->warn("Skipping mentorship seed for tenant {$tenant->slug}: no mentor or interns.");
                continue;
            }

            $this->command?->info("Seeding mentorship data for tenant {$tenant->slug}…");

            $skills = [
                ['Fundamentos UX', 90, 'fundamentos'],
                ['Systems thinking', 68, 'systems'],
                ['Facilitación', 45, 'facilitacion'],
                ['Escritura clara', 78, 'comunicacion'],
            ];

            $quarterGoals = [
                'Liderar una mini-feature de inicio a fin',
                'Presentar research a 2+ equipos',
                'Mentorizar a practicante junior',
                'Completar curso avanzado de diseño',
                'Documentar 3 procesos del equipo',
            ];

            $sessionTopics = [
                ['Kickoff + expectativas', ['onboarding'], 60],
                ['Definición de plan de aprendizaje', ['plan', 'objetivos'], 45],
                ['Feedback sobre research & primeros bocetos', ['research', 'feedback'], 30],
                ['Revisión de sprint + plan de crecimiento Q2', ['retro', 'sprint'], 30],
            ];

            foreach ($interns as $i => $intern) {
                // Asigna mentor rotando
                $mentor = $mentors[$i % $mentors->count()];

                // 4 skills para cada intern
                foreach ($skills as [$skill, $progress, $cat]) {
                    GrowthSkill::updateOrCreate(
                        [
                            'tenant_id' => $tenant->id,
                            'intern_user_id' => $intern->id,
                            'skill' => $skill,
                        ],
                        [
                            'progress_percent' => max(20, $progress - ($i % 3) * 10 + ($i % 2) * 5),
                            'category' => $cat,
                        ],
                    );
                }

                // 2-3 growth goals Q2
                foreach (array_slice($quarterGoals, $i % 3, 3) as $idx => $goalText) {
                    GrowthGoal::create([
                        'tenant_id' => $tenant->id,
                        'intern_user_id' => $intern->id,
                        'text' => $goalText,
                        'quarter' => 'Q2 2026',
                        'done' => $idx === 0 && $i % 4 === 0,
                        'completed_at' => $idx === 0 && $i % 4 === 0 ? now()->subDays(7) : null,
                    ]);
                }

                // Sesiones: 3 pasadas + 1 próxima
                $pastSessions = array_slice($sessionTopics, 0, 3);
                foreach ($pastSessions as $idx => [$topic, $tags, $duration]) {
                    $daysAgo = [45, 25, 10][$idx];
                    MentorSession::create([
                        'tenant_id' => $tenant->id,
                        'mentor_user_id' => $mentor->id,
                        'intern_user_id' => $intern->id,
                        'scheduled_at' => now()->subDays($daysAgo)->setTime(10, 0),
                        'duration_minutes' => $duration,
                        'topic' => $topic,
                        'agenda' => $this->agendaFor($topic),
                        'location' => 'Google Meet',
                        'status' => 'completed',
                        'started_at' => now()->subDays($daysAgo)->setTime(10, 0),
                        'completed_at' => now()->subDays($daysAgo)->setTime(10, (int) $duration),
                        'tags' => $tags,
                    ]);
                }

                // Próxima sesión: mañana 10 AM
                $next = $sessionTopics[3];
                MentorSession::create([
                    'tenant_id' => $tenant->id,
                    'mentor_user_id' => $mentor->id,
                    'intern_user_id' => $intern->id,
                    'scheduled_at' => now()->addDay()->setTime(10, 0),
                    'duration_minutes' => $next[2],
                    'topic' => $next[0],
                    'agenda' => $this->agendaFor($next[0]),
                    'location' => 'Google Meet',
                    'status' => 'scheduled',
                    'tags' => $next[1],
                ]);

                // Notas: 1 privada del mentor + 1 shared
                MentorNote::create([
                    'tenant_id' => $tenant->id,
                    'intern_user_id' => $intern->id,
                    'author_id' => $mentor->id,
                    'visibility' => 'private',
                    'body' => "Observación privada de {$mentor->name}: capacidad técnica sólida, necesita trabajar presentación de ideas en reuniones grandes.",
                    'tags' => ['feedback', 'desarrollo'],
                ]);
                MentorNote::create([
                    'tenant_id' => $tenant->id,
                    'intern_user_id' => $intern->id,
                    'author_id' => $mentor->id,
                    'visibility' => 'shared',
                    'body' => "Acciones acordadas: (1) proponer 3 mejoras de UX del producto en próximos 14 días, (2) co-facilitar una sesión de research con el equipo.",
                    'tags' => ['action-items'],
                ]);
            }

            $this->command?->info("✓ Mentorship seeded for tenant {$tenant->slug}");
        }
    }

    /** @return list<string> */
    private function agendaFor(string $topic): array
    {
        return match (true) {
            str_contains($topic, 'Kickoff') => [
                'Expectativas del programa',
                'Estilo de trabajo del mentor y practicante',
                'Definir cadencia de sesiones',
                'Preguntas abiertas',
            ],
            str_contains($topic, 'plan') => [
                'Objetivos del primer trimestre',
                'Skills prioritarios a desarrollar',
                'Recursos recomendados',
                'Próximos pasos',
            ],
            str_contains($topic, 'Feedback') => [
                'Revisión del research entregado',
                'Feedback sobre bocetos',
                'Áreas de mejora',
                'Plan para la siguiente iteración',
            ],
            default => [
                'Retro del sprint y aprendizajes',
                'Feedback sobre entregables',
                'OKR Q2 — primera propuesta',
                'Bloqueos / preguntas',
            ],
        };
    }
}

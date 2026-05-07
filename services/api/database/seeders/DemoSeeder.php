<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Datos demo multi-tenant para development y testing manual.
 *
 * Crea 3 tenants con datos realistas de un programa de practicantes:
 *   - acme-tech     (plan growth, 20 users, 2 equipos, 40+ tareas, 2 semanas de reports)
 *   - panda-studio  (plan starter, 8 users, 1 equipo, tareas básicas)
 *   - grow-agency   (plan business, 30 users, 3 equipos, full data + evaluaciones)
 *
 * NO correr en producción. `app()->environment('production')` lo bloquea.
 */
class DemoSeeder extends Seeder
{
    public function run(): void
    {
        if (app()->environment('production')) {
            $this->command?->warn('DemoSeeder skipped in production.');
            return;
        }

        DB::transaction(function () {
            [$acme, $panda, $grow] = [
                $this->seedTenant('acme-tech',    'DKN Soluciones Tecnológicas', 'growth'),
                $this->seedTenant('panda-studio', 'Panda Studio',   'starter'),
                $this->seedTenant('grow-agency',  'Grow Agency',    'business'),
            ];

            $this->seedAcme($acme);
            $this->seedPanda($panda);
            $this->seedGrow($grow);
        });

        $this->command?->info("Demo data seeded: 3 tenants.");
        $this->command?->info("Login: admin@acme-tech.demo / password (change in .env DEMO_PASSWORD)");
    }

    private function seedTenant(string $slug, string $name, string $plan): string
    {
        $id = (string) Str::uuid();

        // Por tenant elegimos accent slug + colores HEX coherentes para emails.
        //   - acme-tech (DKN)   → dkn / teal #00a39c
        //   - panda-studio     → terracotta
        //   - grow-agency      → olive
        $accentMap = [
            'acme-tech' => [
                'slug' => 'dkn',
                'primary' => '#00a39c',
                'dark' => '#007973',
            ],
            'panda-studio' => [
                'slug' => 'terracotta',
                'primary' => '#c8532b',
                'dark' => '#8e3a1d',
            ],
            'grow-agency' => [
                'slug' => 'olive',
                'primary' => '#5a7a3f',
                'dark' => '#3e572b',
            ],
        ];
        $accent = $accentMap[$slug] ?? ['slug' => 'cobalt', 'primary' => '#3a5f8a', 'dark' => '#254260'];

        DB::table('tenants')->insert([
            'id' => $id,
            'slug' => $slug,
            'name' => $name,
            'plan' => $plan,
            'status' => 'active',
            'settings' => json_encode([
                'ai_enabled' => true,
                'gamification_enabled' => false,
                'university_reports_enabled' => true,
            ]),
            'theme' => json_encode([
                // brand_primary/dark son HEX para emails (tipados en
                // resources/views/emails/invitation.blade.php).
                'brand_primary' => $accent['primary'],
                'brand_dark' => $accent['dark'],
                // brand_accent es un slug que el AccentLoader del frontend
                // convierte en `<html data-accent="...">` y resuelve vars.
                'brand_accent' => $accent['slug'],
            ]),
            'data_residency' => 'latam',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Set tenant context antes de insertar nada que lleve RLS
        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$id]);

        return $id;
    }

    private function seedAcme(string $tenantId): void
    {
        $this->withTenant($tenantId, function () use ($tenantId) {
            // Departamentos / áreas / equipos
            $depTech = $this->createDepartment($tenantId, 'Tecnología', 'tecnologia');
            $areaProd = $this->createArea($tenantId, $depTech, 'Producto', 'producto');
            $teamDesign = $this->createTeam($tenantId, $areaProd, 'Diseño', 'diseno', '#0891B2');
            $teamDev = $this->createTeam($tenantId, $areaProd, 'Desarrollo', 'dev', '#7C3AED');

            // Admin
            $admin = $this->createUser('admin@acme-tech.demo', 'Ada Admin', $tenantId, 'tenant_admin');

            // Líder de equipo
            $lead = $this->createUser('carlos@acme-tech.demo', 'Carlos Ruiz', $tenantId, 'team_lead');
            DB::table('teams')->where('id', $teamDesign)->update(['lead_user_id' => $lead]);
            $this->addTeamMembership($tenantId, $teamDesign, $lead, 'lead');

            // Mentor
            $mentor = $this->createUser('diana@acme-tech.demo', 'Diana Mora', $tenantId, 'mentor', kind: 'mentor');
            $this->addTeamMembership($tenantId, $teamDesign, $mentor, 'mentor');

            // HR
            $this->createUser('hr@acme-tech.demo', 'Helena Herrera', $tenantId, 'hr');

            // Practicantes (6 en Diseño, 5 en Dev)
            $interns = [
                ['ana@acme-tech.demo', 'Ana García', 'UNAM', 'Diseño Gráfico', 8, $teamDesign],
                ['luis@acme-tech.demo', 'Luis Pérez', 'ITAM', 'Diseño Industrial', 6, $teamDesign],
                ['sara@acme-tech.demo', 'Sara López', 'TEC', 'Diseño Digital', 9, $teamDesign],
                ['marco@acme-tech.demo', 'Marco Díaz', 'IPN', 'Diseño UX', 7, $teamDesign],
                ['carmen@acme-tech.demo', 'Carmen Silva', 'UNAM', 'Comunicación Visual', 8, $teamDesign],
                ['julio@acme-tech.demo', 'Julio Campos', 'UAM', 'Diseño', 6, $teamDesign],
                // Dev
                ['pablo@acme-tech.demo', 'Pablo Vega', 'UNAM', 'Ciencias de la Computación', 7, $teamDev],
                ['sofia@acme-tech.demo', 'Sofía Torres', 'TEC', 'Ing. Software', 8, $teamDev],
                ['diego@acme-tech.demo', 'Diego Moreno', 'ITAM', 'Matemáticas', 9, $teamDev],
                ['lucia@acme-tech.demo', 'Lucía Rivas', 'IPN', 'Ing. Sistemas', 6, $teamDev],
                ['ivan@acme-tech.demo', 'Iván Cruz', 'UAM', 'Ciencias Computacionales', 8, $teamDev],
            ];

            $internIds = [];
            foreach ($interns as [$email, $name, $uni, $career, $semester, $teamId]) {
                $uid = $this->createUser($email, $name, $tenantId, 'intern', kind: 'intern');
                $this->seedInternData($tenantId, $uid, $uni, $career, $semester);
                $this->addTeamMembership($tenantId, $teamId, $uid, 'intern');
                $this->assignMentor($tenantId, $mentor, $uid);
                $internIds[] = [$uid, $teamId];
            }

            // Proyecto
            $project = $this->createProject($tenantId, $teamDesign, 'Landing v2',
                'Rediseño completo del sitio web principal para Q2 2026.', admin: $admin);
            [$listBacklog, $listTodo, $listDoing, $listReview, $listDone] =
                $this->seedKanbanLists($tenantId, $project);

            // Tareas
            $now = Carbon::now();
            $tasks = [
                [$listBacklog, 'Research competidor landing',           'IN_PROGRESS', 'normal', $internIds[0][0] ?? null, $now->copy()->addDays(3)],
                [$listBacklog, 'Moodboard marca',                      'BACKLOG',     'low',    null, null],
                [$listTodo,    'Wireframe hero',                        'TO_DO',       'high',   $internIds[0][0], $now->copy()->addDays(2)],
                [$listTodo,    'Mockup header',                         'TO_DO',       'high',   $internIds[1][0], $now->copy()->addDays(1)],
                [$listDoing,   'Diseño footer v3',                      'IN_PROGRESS', 'normal', $internIds[2][0], $now->copy()->addDays(2)],
                [$listReview,  'Hero alta fidelidad',                   'IN_REVIEW',   'urgent', $internIds[0][0], $now->copy()->subDay()],
                [$listDone,    'Entrega wireframes aprobados',          'DONE',        'normal', $internIds[3][0], $now->copy()->subWeek()],
                [$listDone,    'Brief inicial',                         'DONE',        'normal', $internIds[4][0], $now->copy()->subWeeks(2)],
                [$listDoing,   'Prototipo interactivo',                 'IN_PROGRESS', 'high',   $internIds[5][0], $now->copy()->addDays(5)],
                [$listTodo,    'Revisión con stakeholders',             'TO_DO',       'high',   $lead, $now->copy()->addDays(4)],
                // Blocker
                [$listDoing,   'Integración con API CMS',               'BLOCKED',     'urgent', $internIds[6][0], $now->copy()->addDays(1),
                    'blocked_reason' => 'API aún no expone endpoints necesarios; esperando equipo backend.'],
            ];

            foreach ($tasks as $row) {
                $listId = $row[0];
                [$listId, $title, $state, $priority, $assignee, $due] = [$row[0], $row[1], $row[2], $row[3], $row[4], $row[5]];
                $extra = $row['blocked_reason'] ?? null;
                DB::table('tasks')->insert([
                    'id' => Str::uuid(),
                    'tenant_id' => $tenantId,
                    'project_id' => $project,
                    'list_id' => $listId,
                    'title' => $title,
                    'description' => null,
                    'state' => $state,
                    'priority' => $priority,
                    'assignee_id' => $assignee,
                    'due_at' => $due,
                    'position' => 0,
                    'blocked_reason' => $state === 'BLOCKED' ? $extra : null,
                    'created_by' => $lead,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            // Tags útiles
            $this->seedTags($tenantId, ['UI', 'UX', 'Research', 'Urgente', 'Bug']);

            // Scorecard base
            $this->seedScorecardBase($tenantId);

            // Reportes diarios (últimos 3 días, 3 practicantes)
            foreach (array_slice($internIds, 0, 3) as [$uid, ]) {
                for ($d = 1; $d <= 3; $d++) {
                    DB::table('daily_reports')->insert([
                        'id' => Str::uuid(),
                        'tenant_id' => $tenantId,
                        'user_id' => $uid,
                        'report_date' => $now->copy()->subDays($d)->toDateString(),
                        'status' => 'submitted',
                        'progress_summary' => 'Avancé en la tarea asignada, completé wireframes y subí mockup.',
                        'blockers_text' => $d === 2 ? 'API del CMS aún sin endpoints' : null,
                        'plan_tomorrow' => 'Continuar con revisión de componentes.',
                        'mood' => ['good', 'ok', 'great'][$d % 3],
                        'hours_worked' => 6 + ($d % 3),
                        'submitted_at' => $now->copy()->subDays($d)->setTime(18, 30),
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        });
    }

    private function seedPanda(string $tenantId): void
    {
        $this->withTenant($tenantId, function () use ($tenantId) {
            $dep = $this->createDepartment($tenantId, 'Operaciones', 'ops');
            $area = $this->createArea($tenantId, $dep, 'Marketing', 'marketing');
            $team = $this->createTeam($tenantId, $area, 'Contenido', 'contenido', '#F59E0B');

            $this->createUser('admin@panda-studio.demo', 'Pedro Panda', $tenantId, 'tenant_admin');
            $lead = $this->createUser('lider@panda-studio.demo', 'Laura Líder', $tenantId, 'team_lead');
            $mentor = $this->createUser('mentor@panda-studio.demo', 'Mario Mentor', $tenantId, 'mentor', kind: 'mentor');
            DB::table('teams')->where('id', $team)->update(['lead_user_id' => $lead]);

            foreach (['estudiante1@panda-studio.demo', 'estudiante2@panda-studio.demo', 'estudiante3@panda-studio.demo'] as $i => $email) {
                $uid = $this->createUser($email, "Estudiante " . ($i + 1), $tenantId, 'intern', kind: 'intern');
                $this->seedInternData($tenantId, $uid, 'Universidad de Guadalajara', 'Comunicación', 6 + $i);
                $this->addTeamMembership($tenantId, $team, $uid, 'intern');
                $this->assignMentor($tenantId, $mentor, $uid);
            }

            $project = $this->createProject($tenantId, $team, 'Campaña Q2',
                'Campaña de contenido para Q2.', admin: $lead);
            $this->seedKanbanLists($tenantId, $project);
        });
    }

    private function seedGrow(string $tenantId): void
    {
        $this->withTenant($tenantId, function () use ($tenantId) {
            $dep = $this->createDepartment($tenantId, 'Creative', 'creative');
            $area = $this->createArea($tenantId, $dep, 'Brand', 'brand');
            $team = $this->createTeam($tenantId, $area, 'Brand Design', 'brand-design', '#EF4444');

            $this->createUser('admin@grow-agency.demo', 'Gaby Grow', $tenantId, 'tenant_admin');
            $lead = $this->createUser('lead@grow-agency.demo', 'Leo Líder', $tenantId, 'team_lead');
            $mentor = $this->createUser('mentor@grow-agency.demo', 'Mara Mentora', $tenantId, 'mentor', kind: 'mentor');
            DB::table('teams')->where('id', $team)->update(['lead_user_id' => $lead]);

            // 5 practicantes simples (sin tasks elaborados para mantener seeder manejable)
            for ($i = 1; $i <= 5; $i++) {
                $uid = $this->createUser("intern{$i}@grow-agency.demo", "Practicante {$i}", $tenantId, 'intern', kind: 'intern');
                $this->seedInternData($tenantId, $uid, 'TEC', 'Diseño', 6 + ($i % 4));
                $this->addTeamMembership($tenantId, $team, $uid, 'intern');
                $this->assignMentor($tenantId, $mentor, $uid);
            }

            $project = $this->createProject($tenantId, $team, 'Identidad Cliente X',
                'Sistema de identidad visual completo.', admin: $lead);
            $this->seedKanbanLists($tenantId, $project);
            $this->seedScorecardBase($tenantId);
        });
    }

    // ---------- helpers ----------

    private function withTenant(string $tenantId, callable $cb): void
    {
        DB::statement("SELECT set_config('app.tenant_id', ?, false)", [$tenantId]);
        $cb();
    }

    private function createDepartment(string $tenantId, string $name, string $slug): string
    {
        $id = (string) Str::uuid();
        DB::table('departments')->insert([
            'id' => $id, 'tenant_id' => $tenantId,
            'name' => $name, 'slug' => $slug, 'position' => 0,
            'metadata' => json_encode([]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }

    private function createArea(string $tenantId, string $depId, string $name, string $slug): string
    {
        $id = (string) Str::uuid();
        DB::table('areas')->insert([
            'id' => $id, 'tenant_id' => $tenantId, 'department_id' => $depId,
            'name' => $name, 'slug' => $slug, 'position' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }

    private function createTeam(string $tenantId, string $areaId, string $name, string $slug, string $color): string
    {
        $id = (string) Str::uuid();
        DB::table('teams')->insert([
            'id' => $id, 'tenant_id' => $tenantId, 'area_id' => $areaId,
            'name' => $name, 'slug' => $slug, 'color' => $color,
            'metadata' => json_encode([]),
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }

    private function createUser(string $email, string $name, string $tenantId, string $role, string $kind = 'staff'): string
    {
        $password = env('DEMO_PASSWORD', 'password');
        $uid = (string) Str::uuid();

        DB::table('users')->insert([
            'id' => $uid,
            'email' => $email,
            'password_hash' => Hash::make($password),
            'email_verified_at' => now(),
            'name' => $name,
            'locale' => 'es-MX',
            'timezone' => 'America/Mexico_City',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('memberships')->insert([
            'id' => Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id' => $uid,
            'role' => $role,
            'status' => 'active',
            'joined_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        DB::table('profiles')->insert([
            'id' => Str::uuid(),
            'tenant_id' => $tenantId,
            'user_id' => $uid,
            'kind' => $kind,
            'skills' => json_encode([]),
            'social_links' => json_encode([]),
            'emergency_contact' => json_encode([]),
            'created_at' => now(), 'updated_at' => now(),
        ]);

        return $uid;
    }

    private function seedInternData(string $tenantId, string $userId, string $university, string $career, int $semester): void
    {
        $profileId = DB::table('profiles')
            ->where('user_id', $userId)
            ->where('tenant_id', $tenantId)
            ->value('id');

        DB::table('intern_data')->insert([
            'id' => Str::uuid(),
            'tenant_id' => $tenantId,
            'profile_id' => $profileId,
            'university' => $university,
            'career' => $career,
            'semester' => $semester,
            'mandatory_hours' => 480,
            'hours_completed' => random_int(20, 200),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function addTeamMembership(string $tenantId, string $teamId, string $userId, string $role): void
    {
        DB::table('team_memberships')->insert([
            'id' => Str::uuid(),
            'tenant_id' => $tenantId,
            'team_id' => $teamId,
            'user_id' => $userId,
            'role' => $role,
            'joined_at' => now(),
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function assignMentor(string $tenantId, string $mentorId, string $internId): void
    {
        DB::table('mentor_assignments')->insert([
            'id' => Str::uuid(),
            'tenant_id' => $tenantId,
            'mentor_user_id' => $mentorId,
            'intern_user_id' => $internId,
            'started_at' => now(),
            'status' => 'active',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function createProject(string $tenantId, string $teamId, string $name, string $description, string $admin): string
    {
        $id = (string) Str::uuid();
        DB::table('projects')->insert([
            'id' => $id, 'tenant_id' => $tenantId, 'team_id' => $teamId,
            'name' => $name, 'slug' => Str::slug($name),
            'description' => $description,
            'status' => 'active',
            'metadata' => json_encode([]),
            'start_date' => now()->subMonth()->toDateString(),
            'created_by' => $admin,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return $id;
    }

    private function seedKanbanLists(string $tenantId, string $projectId): array
    {
        $lists = ['Backlog', 'To Do', 'En curso', 'Revisión', 'Hecho'];
        $ids = [];
        foreach ($lists as $i => $name) {
            $id = (string) Str::uuid();
            DB::table('task_lists')->insert([
                'id' => $id, 'tenant_id' => $tenantId, 'project_id' => $projectId,
                'name' => $name, 'position' => $i,
                'created_at' => now(), 'updated_at' => now(),
            ]);
            $ids[] = $id;
        }
        return $ids;
    }

    private function seedTags(string $tenantId, array $names): void
    {
        $colors = ['#0891B2', '#7C3AED', '#F59E0B', '#EF4444', '#10B981'];
        foreach ($names as $i => $name) {
            DB::table('tags')->insert([
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'name' => $name,
                'slug' => Str::slug($name),
                'color' => $colors[$i % count($colors)],
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    private function seedScorecardBase(string $tenantId): void
    {
        $sid = (string) Str::uuid();
        DB::table('scorecards')->insert([
            'id' => $sid, 'tenant_id' => $tenantId,
            'name' => 'Evaluación estándar · Practicante',
            'description' => 'Scorecard base con KPIs automáticos y cualitativos.',
            'applicable_to' => 'intern',
            'is_active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $metrics = [
            ['tasks_on_time',       'Tareas a tiempo (%)',         'auto',    'tasks',    85.00, 'percent', 1.5, 0],
            ['avg_review_score',    'Calidad promedio (reviews)',  'auto',    'reviews',  8.00,  'score',   1.5, 1],
            ['hours_logged',        'Horas registradas',           'auto',    'time',     null,  'hours',   1.0, 2],
            ['visual_design',       'Diseño visual',               'likert',  null,       null,  'score',   1.0, 3],
            ['communication',       'Comunicación',                'likert',  null,       null,  'score',   1.0, 4],
            ['teamwork',            'Trabajo en equipo',           'likert',  null,       null,  'score',   1.0, 5],
        ];

        foreach ($metrics as [$key, $label, $type, $source, $target, $unit, $weight, $pos]) {
            DB::table('scorecard_metrics')->insert([
                'id' => Str::uuid(),
                'tenant_id' => $tenantId,
                'scorecard_id' => $sid,
                'key' => $key,
                'label' => $label,
                'type' => $type,
                'source' => $source,
                'target_value' => $target,
                'unit' => $unit,
                'weight' => $weight,
                'config' => json_encode([]),
                'position' => $pos,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }
}

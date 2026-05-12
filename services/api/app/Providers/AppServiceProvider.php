<?php

declare(strict_types=1);

namespace App\Providers;

use App\Mail\AddGlobalReplyTo;
use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Infrastructure\Clients\ClaudeLlmClient;
use App\Modules\AI\Infrastructure\Clients\FakeLlmClient;
use App\Modules\Gamification\Application\RecentAwardsCollector;
use Illuminate\Mail\Events\MessageSending;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // NeonDB SNI workaround: PHP libpq < 13 (Windows PHP 8.2 trae 11.4)
        // no envía SNI durante el TLS handshake, y NeonDB usa el hostname
        // para routear al endpoint correcto del compute. Sin eso tira:
        //   "Endpoint ID is not specified. ... pass the endpoint ID as a
        //    parameter: '?options=endpoint=<endpoint-id>'"
        // putenv('PGOPTIONS=...') no se propaga a libpq en Windows, así que
        // sobreescribimos el connector pgsql por uno que appendea
        // `options=endpoint=...` directamente al DSN de PDO. El valor sale
        // del config key `pg_options` (database.php → env PG_OPTIONS).
        $this->app->bind('db.connector.pgsql', \App\Database\NeonPostgresConnector::class);

        // Binding del LLM client según config('ai.provider') y disponibilidad de API key.
        // Si no hay ANTHROPIC_API_KEY configurada, caemos a FakeLlmClient para dev local.
        // Una instancia POR REQUEST. Acumula awards otorgadas durante el
        // ciclo HTTP para que AppendRecentAwards las añada al JSON final.
        $this->app->scoped(RecentAwardsCollector::class);

        $this->app->singleton(LlmClient::class, function () {
            $provider = config('ai.provider', 'claude');
            if ($provider === 'fake' || empty(config('services.anthropic.api_key'))) {
                return new FakeLlmClient();
            }
            return match ($provider) {
                'claude' => new ClaudeLlmClient(),
                // fase 2: 'openai' => new OpenAiLlmClient(),
                default => throw new \RuntimeException(
                    'Unsupported AI provider: ' . config('ai.provider')
                ),
            };
        });
    }

    public function boot(): void
    {
        // ── Producción: forzar flags de session/cookie ─────────────────────
        //
        // Sin esto la cookie de session devuelta post-login viaja con
        // SameSite=Lax (default Laravel), que el browser bloquea en cross-
        // origin XHR/fetch — incluso entre subdominios del mismo apex —
        // y todos los GETs subsequentes (notifications, presence,
        // unread-count) reciben 401 porque la cookie no llega.
        //
        // Hacemos el override en código (no env) para que sea immune al
        // config:cache stale: si `php artisan config:cache` corrió en build
        // phase con envs vacías, las envs runtime se ignoran de todas formas
        // — pero este boot() corre en CADA request y aplica los valores
        // correctos al runtime config.
        if (app()->environment('production')) {
            config([
                'session.same_site' => 'none',
                'session.secure' => true,
                'session.domain' => env('SESSION_DOMAIN', '.datakaan.com'),
                'session.http_only' => true,
            ]);

            // Asegura que url() y route() generen https:// (Railway termina
            // TLS upstream — sin esto Laravel ve la request como http y
            // genera URLs con http://, rompiendo emails y redirects).
            URL::forceScheme('https');
        }

        Event::listen(MessageSending::class, AddGlobalReplyTo::class);

        // Event → Listener bindings (Laravel 11 manual registration).
        // Mantener agrupado por módulo. Si falta un binding aquí, el listener
        // nunca se dispara aunque el evento se haga `event(...)`.

        // Identity
        Event::listen(
            \App\Modules\Identity\Domain\Events\UserInvited::class,
            \App\Modules\Identity\Infrastructure\Listeners\SendInvitationEmail::class,
        );
        Event::listen(
            \App\Modules\Identity\Domain\Events\UserLoggedIn::class,
            \App\Modules\Identity\Infrastructure\Listeners\AuditUserLogin::class,
        );
        Event::listen(
            \App\Modules\Identity\Domain\Events\UserActivated::class,
            \App\Modules\Onboarding\Infrastructure\Listeners\ProvisionNewMemberResources::class,
        );

        // Tasks
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TaskAssigned::class,
            \App\Modules\Notifications\Infrastructure\Listeners\NotifyTaskAssigned::class,
        );
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TaskCommented::class,
            \App\Modules\Notifications\Infrastructure\Listeners\NotifyCommentMentions::class,
        );
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TimeEntryStopped::class,
            \App\Modules\Tasks\Infrastructure\Listeners\UpdateTaskActualMinutes::class,
        );
        Event::listen(
            [
                \App\Modules\Tasks\Domain\Events\TaskCreated::class,
                \App\Modules\Tasks\Domain\Events\TaskUpdated::class,
                \App\Modules\Tasks\Domain\Events\TaskStateChanged::class,
            ],
            \App\Modules\Tasks\Infrastructure\Listeners\AuditTaskActivity::class,
        );

        // Tracking
        Event::listen(
            \App\Modules\Tracking\Domain\Events\BlockerRaised::class,
            \App\Modules\Notifications\Infrastructure\Listeners\NotifyBlockerRaised::class,
        );
        Event::listen(
            \App\Modules\Tracking\Domain\Events\DailyReportSubmitted::class,
            \App\Modules\Notifications\Infrastructure\Listeners\NotifyDailyReportSubmitted::class,
        );
        Event::listen(
            \App\Modules\Tracking\Domain\Events\DailyReportSubmitted::class,
            \App\Modules\AI\Infrastructure\Listeners\TriggerDailySummary::class,
        );

        // People — recálculo automático de horas del programa.
        // Cuando el practicante envía bitácora, sumamos sus hours_worked
        // submitted al `intern_data.hours_completed` (era 100% manual).
        Event::listen(
            \App\Modules\Tracking\Domain\Events\DailyReportSubmitted::class,
            \App\Modules\People\Application\Listeners\RecomputeInternHours::class,
        );

        // Gamification — engine que mueve user_points y user_badges en respuesta
        // a la actividad real del workspace. Cualquier badge nueva debe
        // ENCHUFAR un listener aquí, o queda dormida.
        Event::listen(
            \App\Modules\Tracking\Domain\Events\DailyReportSubmitted::class,
            \App\Modules\Gamification\Application\Listeners\AwardPointsOnDailyReport::class,
        );
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TaskStateChanged::class,
            \App\Modules\Gamification\Application\Listeners\AwardPointsOnTaskDone::class,
        );
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TaskCommented::class,
            \App\Modules\Gamification\Application\Listeners\AwardCollabOnComment::class,
        );
        Event::listen(
            \App\Modules\Onboarding\Domain\Events\OnboardingChecklistCompleted::class,
            \App\Modules\Gamification\Application\Listeners\AwardBadgeOnOnboardingComplete::class,
        );
        Event::listen(
            \App\Modules\People\Domain\Events\InternAssignedToMentor::class,
            \App\Modules\Gamification\Application\Listeners\AwardBadgeOnMentorAssignment::class,
        );
        Event::listen(
            \App\Modules\People\Domain\Events\InternHired::class,
            \App\Modules\Gamification\Application\Listeners\AwardLegacyInternBadge::class,
        );
        Event::listen(
            \App\Modules\Tasks\Domain\Events\ProjectCompleted::class,
            \App\Modules\Gamification\Application\Listeners\AwardFirstProjectBadge::class,
        );
        Event::listen(
            \App\Modules\Performance\Domain\Events\EvaluationSubmitted::class,
            \App\Modules\Gamification\Application\Listeners\AwardExemplaryFeedbackBadge::class,
        );

        // OKR auto-progress: cuando una task vinculada a un KR cambia de
        // estado, recalcula `progress_percent` del KR como % de tareas DONE.
        Event::listen(
            \App\Modules\Tasks\Domain\Events\TaskStateChanged::class,
            \App\Modules\Okrs\Application\Listeners\RecomputeKeyResultProgress::class,
        );
    }
}

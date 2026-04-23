<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Listeners;

use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Infrastructure\Notifications\DailyReportSubmittedNotification;
use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

/**
 * Al enviar un reporte diario, notifica al mentor activo del autor y a los leads de sus teams.
 */
final class NotifyDailyReportSubmitted implements ShouldQueue
{
    public string $queue = 'notifications';
    public int $tries = 5;
    public int $backoff = 10;

    public function handle(DailyReportSubmitted $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->report->tenant_id,
            do: function () use ($event) {
                TenantContext::run($event->report->tenant_id, function () use ($event) {
                    $recipients = $this->resolveRecipients($event);
                    $event->report->load('user');

                    foreach ($recipients as $user) {
                        $user->notify(new DailyReportSubmittedNotification($event->report));
                    }
                });
            }
        );
    }

    /**
     * @return list<User>
     */
    private function resolveRecipients(DailyReportSubmitted $event): array
    {
        $authorId = $event->report->user_id;
        $tenantId = $event->report->tenant_id;

        // Mentor activo del autor
        $mentorIds = DB::table('mentor_assignments')
            ->where('tenant_id', $tenantId)
            ->where('intern_user_id', $authorId)
            ->where('status', 'active')
            ->pluck('mentor_user_id');

        // Leads de los teams donde el autor está activo
        $leadIds = DB::table('teams as t')
            ->join('team_memberships as tm', 't.id', '=', 'tm.team_id')
            ->where('tm.user_id', $authorId)
            ->whereNull('tm.left_at')
            ->where('t.tenant_id', $tenantId)
            ->whereNotNull('t.lead_user_id')
            ->pluck('t.lead_user_id');

        $ids = $mentorIds->concat($leadIds)->unique()->filter(fn ($id) => $id !== $authorId);

        return User::query()->whereIn('id', $ids)->get()->all();
    }
}

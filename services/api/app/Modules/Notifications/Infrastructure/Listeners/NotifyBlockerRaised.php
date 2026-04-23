<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Listeners;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\User;
use App\Modules\Notifications\Infrastructure\Notifications\BlockerRaisedNotification;
use App\Modules\Tracking\Domain\Enums\BlockerSeverity;
use App\Modules\Tracking\Domain\Events\BlockerRaised;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;

/**
 * Notifica a los roles correctos según severity:
 *   - low/medium: al mentor asignado (si hay) + lead del team
 *   - high/critical: + HR + tenant_admin
 */
final class NotifyBlockerRaised implements ShouldQueue
{
    public string $queue = 'notifications';
    public int $tries = 5;
    public int $backoff = 10;

    public function handle(BlockerRaised $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->blocker->tenant_id,
            do: function () use ($event) {
                TenantContext::run($event->blocker->tenant_id, function () use ($event) {
                    $recipients = $this->resolveRecipients($event);
                    foreach ($recipients as $user) {
                        $user->notify(new BlockerRaisedNotification($event->blocker));
                    }
                });
            }
        );
    }

    /**
     * @return list<User>
     */
    private function resolveRecipients(BlockerRaised $event): array
    {
        $blocker = $event->blocker;
        $isHighImpact = in_array($blocker->severity, [
            BlockerSeverity::High, BlockerSeverity::Critical,
        ], true);

        $roles = [
            MembershipRole::TeamLead->value,
            MembershipRole::Mentor->value,
        ];
        if ($isHighImpact) {
            $roles[] = MembershipRole::HR->value;
            $roles[] = MembershipRole::TenantAdmin->value;
        }

        return User::query()
            ->whereHas('memberships', fn ($q) => $q
                ->where('tenant_id', $blocker->tenant_id)
                ->whereIn('role', $roles)
                ->where('status', 'active'))
            ->where('id', '!=', $blocker->raised_by)
            ->get()
            ->all();
    }
}

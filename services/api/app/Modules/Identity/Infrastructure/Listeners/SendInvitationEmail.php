<?php

declare(strict_types=1);

namespace App\Modules\Identity\Infrastructure\Listeners;

use App\Modules\Identity\Domain\Events\UserInvited;
use App\Modules\Identity\Infrastructure\Notifications\InvitationNotification;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\Notification;

final class SendInvitationEmail implements ShouldQueue
{
    public string $queue = 'notifications';
    public int $tries = 5;
    public int $backoff = 10;
    public int $timeout = 60;

    public function handle(UserInvited $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->invitation->tenant_id,
            do: function () use ($event) {
                TenantContext::run($event->invitation->tenant_id, function () use ($event) {
                    $tenant = TenantContext::current();

                    Notification::route('mail', $event->invitation->email)
                        ->notify(new InvitationNotification(
                            invitation: $event->invitation,
                            tenant: $tenant,
                            plainToken: $event->plainToken,
                            inviterName: $event->actor->name ?? 'Un miembro del equipo',
                        ));
                });
            }
        );
    }

    public function failed(UserInvited $event, \Throwable $e): void
    {
        report($e);
    }
}

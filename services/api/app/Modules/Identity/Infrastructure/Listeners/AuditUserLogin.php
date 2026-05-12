<?php

declare(strict_types=1);

namespace App\Modules\Identity\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\Identity\Domain\Events\UserLoggedIn;
use App\Modules\Identity\Domain\User;
use Illuminate\Support\Facades\DB;

/**
 * Registra login en activity_log + actualiza last_login_at. Sync (sub-ms)
 * para mantener trazabilidad incluso si las colas caen.
 */
final class AuditUserLogin
{
    public function handle(UserLoggedIn $event): void
    {
        ActivityLogger::record(
            tenantId: $event->tenantId,
            logName: 'auth',
            event: 'login',
            description: ($event->user->name ?? $event->user->email) . ' inició sesión',
            subjectType: User::class,
            subjectId: $event->user->id,
            causerId: $event->user->id,
            properties: ['email' => $event->user->email],
        );

        DB::table('users')
            ->where('id', $event->user->id)
            ->update(['last_login_at' => now()]);
    }
}

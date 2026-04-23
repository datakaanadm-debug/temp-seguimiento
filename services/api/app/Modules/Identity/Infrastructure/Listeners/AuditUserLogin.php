<?php

declare(strict_types=1);

namespace App\Modules\Identity\Infrastructure\Listeners;

use App\Modules\Identity\Domain\Events\UserLoggedIn;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Registra login en activity_log. Sync (sub-millisegundo) para mantener la trazabilidad
 * incluso si las colas caen.
 */
final class AuditUserLogin
{
    public function handle(UserLoggedIn $event): void
    {
        DB::table('activity_log')->insert([
            'id' => Str::uuid()->toString(),
            'tenant_id' => $event->tenantId,
            'log_name' => 'auth',
            'description' => 'User logged in',
            'subject_type' => 'App\\Modules\\Identity\\Domain\\User',
            'subject_id' => $event->user->id,
            'causer_type' => 'App\\Modules\\Identity\\Domain\\User',
            'causer_id' => $event->user->id,
            'event' => 'login',
            'properties' => json_encode([
                'email' => $event->user->email,
            ]),
            'ip_address' => $event->ipAddress,
            'user_agent' => $event->userAgent,
            'request_id' => request()->header('X-Request-Id'),
            'created_at' => now(),
        ]);

        // Actualizar last_login_at en la tabla de users (fuera de RLS)
        DB::table('users')
            ->where('id', $event->user->id)
            ->update(['last_login_at' => now()]);
    }
}

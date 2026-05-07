<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Infrastructure\Listeners;

use App\Modules\Identity\Domain\Events\UserActivated;
use App\Modules\Onboarding\Application\Services\OnboardingTemplateService;
use App\Shared\Idempotency\ProcessedEvent;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Support\Facades\DB;

/**
 * Cuando un nuevo miembro activa su cuenta (acepta invitación):
 *  - Crea un Profile con el `kind` derivado del role.
 *  - Si es intern: crea intern_data + provisiona checklist de onboarding.
 *  - Si es mentor: crea mentor_data con defaults.
 *
 * Idempotente: si Profile ya existe, no vuelve a crearlo ni a provisionar items.
 */
final class ProvisionNewMemberResources implements ShouldQueue
{
    public int $tries = 3;

    public function __construct(
        private readonly OnboardingTemplateService $onboardingTemplate,
    ) {}

    public function handle(UserActivated $event): void
    {
        ProcessedEvent::guard(
            eventId: $event->id,
            handler: self::class,
            tenantId: $event->tenant->id,
            do: function () use ($event) {
                TenantContext::run($event->tenant->id, function () use ($event) {
                    $this->provision($event);
                });
            },
        );
    }

    private function provision(UserActivated $event): void
    {
        $tenantId = $event->tenant->id;
        $userId = $event->user->id;

        $membership = DB::table('memberships')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->first();
        if (!$membership) {
            return;
        }

        $kind = $this->kindFromRole($membership->role);

        $profileExists = DB::table('profiles')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $userId)
            ->exists();

        if (!$profileExists) {
            $profileId = (string) \App\Shared\Support\Uuid::v7();
            DB::table('profiles')->insert([
                'id' => $profileId,
                'tenant_id' => $tenantId,
                'user_id' => $userId,
                'kind' => $kind,
                'start_date' => now()->toDateString(),
                'skills' => '[]',
                'social_links' => '{}',
                'emergency_contact' => '{}',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($kind === 'intern') {
                DB::table('intern_data')->insert([
                    'id' => (string) \App\Shared\Support\Uuid::v7(),
                    'tenant_id' => $tenantId,
                    'profile_id' => $profileId,
                    'hours_completed' => 0,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        if ($kind === 'intern') {
            $hasOnboarding = DB::table('onboarding_items')
                ->where('tenant_id', $tenantId)
                ->where('intern_user_id', $userId)
                ->exists();
            if (!$hasOnboarding) {
                $this->onboardingTemplate->provisionFor($tenantId, $userId, now());
            }
        }
    }

    private function kindFromRole(string $role): string
    {
        return match ($role) {
            'intern' => 'intern',
            'mentor' => 'mentor',
            'hr' => 'hr',
            'tenant_admin' => 'admin',
            default => 'staff',
        };
    }

    public function failed(UserActivated $event, \Throwable $e): void
    {
        report($e);
    }
}

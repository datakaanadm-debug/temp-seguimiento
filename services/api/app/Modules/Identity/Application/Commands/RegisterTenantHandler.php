<?php

declare(strict_types=1);

namespace App\Modules\Identity\Application\Commands;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\Identity\Domain\Enums\MembershipStatus;
use App\Modules\Identity\Domain\Enums\TenantPlan;
use App\Modules\Identity\Domain\Enums\TenantStatus;
use App\Modules\Identity\Domain\Events\TenantCreated;
use App\Modules\Identity\Domain\Exceptions\TenantSlugTaken;
use App\Modules\Identity\Domain\Membership;
use App\Modules\Identity\Domain\Tenant;
use App\Modules\Identity\Domain\User;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Crea un tenant nuevo con su primer user admin en una sola transacción.
 *
 * Este handler corre SIN contexto de tenant previo (es pre-tenant): se encarga de
 * crear la fila en `tenants` y luego bindea el tenant recién creado para crear
 * la membership en el mismo request.
 */
final class RegisterTenantHandler
{
    public function handle(RegisterTenant $command): Tenant
    {
        return DB::transaction(function () use ($command) {
            // 1. Verificar unicidad del slug (pre-check; la UNIQUE constraint es la última defensa)
            $slugTaken = Tenant::query()
                ->withoutGlobalScopes()
                ->where('slug', $command->slug)
                ->exists();

            if ($slugTaken) {
                throw TenantSlugTaken::for($command->slug);
            }

            // 2. Crear el tenant con trial de 14 días
            $tenant = new Tenant();
            $tenant->slug = $command->slug;
            $tenant->name = $command->name;
            $tenant->plan = TenantPlan::from($command->plan);
            $tenant->status = TenantStatus::Trialing;
            $tenant->data_residency = $command->dataResidency;
            $tenant->trial_ends_at = now()->addDays(14);
            $tenant->settings = [
                'ai_enabled' => true,
                'gamification_enabled' => false,
                'university_reports_enabled' => true,
            ];
            $tenant->theme = [];
            $tenant->save();

            // 3. Crear el user (o reusar si ya existe por email — fase 2 multi-tenant por user)
            $user = User::query()->where('email', $command->adminEmail)->first();
            if (!$user) {
                $user = new User();
                $user->email = $command->adminEmail;
                $user->name = $command->adminName;
                $user->password_hash = Hash::make($command->adminPassword);
                $user->email_verified_at = null; // admin debe verificar email también
                $user->save();
            }

            // 4. Bindear tenant para que BelongsToTenant no explote al crear membership
            TenantContext::setCurrent($tenant);

            // 5. Crear membership como tenant_admin
            Membership::create([
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'role' => MembershipRole::TenantAdmin->value,
                'status' => MembershipStatus::Active->value,
                'joined_at' => now(),
            ]);

            // 6. Emitir evento post-commit (seeders, welcome email, telemetría)
            DB::afterCommit(function () use ($tenant, $user) {
                event(new TenantCreated($tenant, $user));
            });

            return $tenant;
        });
    }
}

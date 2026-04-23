<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Application\Commands\RegisterTenant;
use App\Modules\Identity\Application\Commands\RegisterTenantHandler;
use App\Modules\Identity\Domain\Exceptions\TenantSlugTaken;
use App\Modules\Identity\Http\Requests\RegisterTenantRequest;
use App\Modules\Identity\Http\Resources\TenantResource;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Validation\ValidationException;

final class TenantController extends Controller
{
    public function __construct(
        private readonly RegisterTenantHandler $registerHandler,
    ) {}

    /**
     * POST /api/v1/tenants/register   (pre-tenant endpoint, no requiere subdomain)
     *
     * Crea un tenant nuevo con su primer user admin.
     */
    public function register(RegisterTenantRequest $request): JsonResponse
    {
        try {
            $tenant = $this->registerHandler->handle(new RegisterTenant(
                slug: strtolower((string) $request->string('slug')),
                name: $request->string('name'),
                adminEmail: strtolower((string) $request->string('admin_email')),
                adminName: $request->string('admin_name'),
                adminPassword: $request->string('admin_password'),
                plan: $request->string('plan', 'starter'),
                dataResidency: $request->string('data_residency', 'latam'),
            ));
        } catch (TenantSlugTaken $e) {
            throw ValidationException::withMessages([
                'slug' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'tenant' => TenantResource::make($tenant)->resolve(),
            'message' => 'Tenant registered. Check your email to verify.',
        ], 201);
    }

    /**
     * GET /api/v1/tenant        (tenant actual; requiere contexto)
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'tenant' => TenantResource::make(TenantContext::current())->resolve(),
        ]);
    }

    /**
     * PUT /api/v1/tenant        Actualizar datos de la empresa (solo admin).
     */
    public function update(Request $request): JsonResponse
    {
        $me = $request->user();
        if (!method_exists($me, 'primaryRole') || $me->primaryRole()?->value !== 'tenant_admin') {
            abort(403, 'Sólo un administrador del tenant puede editar la empresa.');
        }

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:200'],
            'slug' => ['sometimes', 'string', 'max:80', 'regex:/^[a-z0-9-]+$/'],
            'data_residency' => ['sometimes', 'in:latam,us,eu'],
            'plan' => ['sometimes', 'in:starter,growth,business,enterprise'],
            'theme' => ['sometimes', 'array'],
            'theme.brand_primary' => ['sometimes', 'string', 'max:20'],
            'theme.brand_dark' => ['sometimes', 'string', 'max:20'],
            'theme.brand_accent' => ['sometimes', 'string', 'max:20'],
            'settings' => ['sometimes', 'array'],
            'settings.industry' => ['sometimes', 'string', 'max:60'],
            'settings.size' => ['sometimes', 'string', 'max:20'],
            'settings.domain' => ['sometimes', 'nullable', 'string', 'max:120'],
        ]);

        $tenant = TenantContext::current();

        if (isset($data['slug']) && $data['slug'] !== $tenant->slug) {
            $exists = \App\Modules\Identity\Domain\Tenant::where('slug', $data['slug'])
                ->where('id', '!=', $tenant->id)->exists();
            if ($exists) {
                throw ValidationException::withMessages(['slug' => 'Slug ya en uso.']);
            }
        }

        // Merge settings/theme (no reemplazar arrays completos)
        if (isset($data['theme'])) {
            $data['theme'] = array_merge((array) $tenant->theme, $data['theme']);
        }
        if (isset($data['settings'])) {
            $data['settings'] = array_merge((array) $tenant->settings, $data['settings']);
        }

        $tenant->fill($data);
        $tenant->save();

        return response()->json([
            'tenant' => TenantResource::make($tenant->fresh())->resolve(),
        ]);
    }
}

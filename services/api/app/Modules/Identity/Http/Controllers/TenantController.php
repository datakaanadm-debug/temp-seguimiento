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
}

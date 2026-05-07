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
                name: (string) $request->string('name'),
                adminEmail: strtolower((string) $request->string('admin_email')),
                adminName: (string) $request->string('admin_name'),
                adminPassword: (string) $request->string('admin_password'),
                plan: (string) $request->string('plan', 'starter'),
                dataResidency: (string) $request->string('data_residency', 'latam'),
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

    /**
     * POST /api/v1/tenant/logo  (multipart con campo `file`)
     *
     * Almacena el archivo en disk con key estable por tenant y guarda la URL
     * pública (proxy GET /api/v1/tenants/{id}/logo) en `tenant.theme.logo_url`.
     */
    public function uploadLogo(Request $request): JsonResponse
    {
        $me = $request->user();
        if (!method_exists($me, 'primaryRole') || $me->primaryRole()?->value !== 'tenant_admin') {
            abort(403, 'Sólo un administrador del tenant puede cambiar el logo.');
        }

        $request->validate([
            'file' => ['required', 'file', 'image', 'mimes:png,jpg,jpeg,svg,webp', 'max:2048'], // 2 MB
        ]);

        $tenant = TenantContext::current();
        $file = $request->file('file');
        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        $storedKey = "tenants/{$tenant->id}/logo.{$ext}";

        // Borra logos previos con otra extensión
        foreach (['png', 'jpg', 'jpeg', 'svg', 'webp'] as $oldExt) {
            $oldKey = "tenants/{$tenant->id}/logo.{$oldExt}";
            if ($oldKey !== $storedKey) {
                \Illuminate\Support\Facades\Storage::delete($oldKey);
            }
        }
        \Illuminate\Support\Facades\Storage::put($storedKey, file_get_contents($file->getRealPath()));

        $logoUrl = url("/api/v1/tenants/{$tenant->id}/logo?v=" . time());
        $theme = (array) ($tenant->theme ?? []);
        $theme['logo_url'] = $logoUrl;
        $theme['logo_key'] = $storedKey;
        $theme['logo_mime'] = $file->getMimeType();
        $tenant->theme = $theme;
        $tenant->save();

        return response()->json([
            'tenant' => TenantResource::make($tenant->fresh())->resolve(),
            'logo_url' => $logoUrl,
        ]);
    }

    /**
     * DELETE /api/v1/tenant/logo
     */
    public function removeLogo(Request $request): JsonResponse
    {
        $me = $request->user();
        if (!method_exists($me, 'primaryRole') || $me->primaryRole()?->value !== 'tenant_admin') {
            abort(403);
        }

        $tenant = TenantContext::current();
        $theme = (array) ($tenant->theme ?? []);
        if (!empty($theme['logo_key'])) {
            \Illuminate\Support\Facades\Storage::delete((string) $theme['logo_key']);
        }
        unset($theme['logo_url'], $theme['logo_key'], $theme['logo_mime']);
        $tenant->theme = $theme;
        $tenant->save();

        return response()->json(['tenant' => TenantResource::make($tenant->fresh())->resolve()]);
    }

    /**
     * GET /api/v1/tenants/{tenant}/logo  (público — el logo es branding, no PII).
     */
    public function showLogo(string $tenantId): \Symfony\Component\HttpFoundation\Response
    {
        $tenant = \App\Modules\Identity\Domain\Tenant::query()
            ->withoutGlobalScopes()
            ->find($tenantId);
        if (!$tenant) abort(404);

        $theme = (array) ($tenant->theme ?? []);
        $key = $theme['logo_key'] ?? null;
        if (!$key || !\Illuminate\Support\Facades\Storage::exists($key)) {
            abort(404);
        }

        return response(\Illuminate\Support\Facades\Storage::get($key), 200, [
            'Content-Type' => $theme['logo_mime'] ?? 'image/png',
            'Cache-Control' => 'public, max-age=86400',
        ]);
    }
}

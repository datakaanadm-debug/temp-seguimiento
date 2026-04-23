<?php

declare(strict_types=1);

namespace App\Modules\Identity\Http\Controllers;

use App\Modules\Identity\Domain\Events\UserLoggedIn;
use App\Modules\Identity\Domain\User;
use App\Modules\Identity\Http\Requests\LoginRequest;
use App\Modules\Identity\Http\Resources\TenantResource;
use App\Modules\Identity\Http\Resources\UserResource;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

final class AuthController extends Controller
{
    /**
     * POST /api/v1/auth/login
     *
     * Auth con email + password. El tenant debe estar resuelto por subdomain antes de llegar aquí.
     * Tras login exitoso, valida que el user pertenece al tenant actual.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        $request->ensureIsNotRateLimited();

        $email = strtolower((string) $request->string('email'));
        $user = User::query()->where('email', $email)->first();

        if (!$user || !Hash::check($request->string('password'), $user->getAuthPassword())) {
            $request->hitRateLimit();
            throw ValidationException::withMessages([
                'email' => 'Credenciales inválidas.',
            ]);
        }

        // Validar pertenencia al tenant actual
        $tenantId = TenantContext::currentId();
        $membership = $user->memberships()
            ->where('tenant_id', $tenantId)
            ->where('status', 'active')
            ->first();

        if (!$membership) {
            $request->hitRateLimit();
            throw ValidationException::withMessages([
                'email' => 'Credenciales inválidas.',
            ]);
        }

        $request->clearRateLimit();

        // Login stateful (Sanctum web)
        Auth::login($user, remember: (bool) $request->boolean('remember'));
        $request->session()->regenerate();

        // Marcar última actividad
        $membership->last_active_at = now();
        $membership->save();

        event(new UserLoggedIn(
            user: $user,
            tenantId: $tenantId,
            ipAddress: $request->ip(),
            userAgent: $request->userAgent(),
        ));

        return response()->json([
            'user' => UserResource::make($user)->resolve(),
            'tenant' => TenantResource::make(TenantContext::current())->resolve(),
        ]);
    }

    /**
     * POST /api/v1/auth/logout
     */
    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    /**
     * GET /api/v1/auth/me
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        return response()->json([
            'user' => UserResource::make($user)->resolve(),
            'tenant' => TenantResource::make(TenantContext::current())->resolve(),
        ]);
    }

    /**
     * GET /sanctum/csrf-cookie — Laravel Sanctum lo maneja. Endpoint público alternativo.
     */
    public function csrfCookie(): JsonResponse
    {
        return response()->json(['ok' => true]);
    }
}

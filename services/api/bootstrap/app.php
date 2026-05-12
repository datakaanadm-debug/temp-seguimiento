<?php

declare(strict_types=1);

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api/v1.php',
        apiPrefix: 'api/v1',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'tenant' => \App\Http\Middleware\ResolveTenant::class,
            'tenant.member' => \App\Http\Middleware\EnsureUserBelongsToTenant::class,
        ]);

        // Railway / Vercel / cualquier PaaS hace TLS termination en un proxy
        // upstream y forwardea HTTP a la app. Sin trustProxies Laravel piensa
        // que la request es insecure, no setea cookies Secure (XSRF-TOKEN y
        // session quedan vacías en el browser cross-site) y devolvemos 419 en
        // el siguiente POST. `at: '*'` confía en todos los hops porque las IPs
        // del proxy de Railway no son estables.
        $middleware->trustProxies(at: '*', headers:
            \Illuminate\Http\Request::HEADER_X_FORWARDED_FOR
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_HOST
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PORT
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_PROTO
            | \Illuminate\Http\Request::HEADER_X_FORWARDED_AWS_ELB,
        );

        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);
        // Inyecta `_awarded_badges` en JSON cuando un listener otorgó badges
        // durante este request (gamification engine).
        $middleware->append(\App\Http\Middleware\AppendRecentAwards::class);

        $middleware->statefulApi();

        // Para rutas API, no redirigir a login. Devolver JSON 401.
        $middleware->redirectGuestsTo(fn (\Illuminate\Http\Request $req) => $req->expectsJson() || $req->is('api/*') ? null : route('login'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->dontFlash([
            'password',
            'password_confirmation',
            'admin_password',
            'token',
            'two_factor_secret',
            'national_id',
        ]);
    })
    ->create();

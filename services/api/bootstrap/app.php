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

        $middleware->append(\App\Http\Middleware\SecurityHeaders::class);

        $middleware->statefulApi();
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

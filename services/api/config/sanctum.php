<?php

declare(strict_types=1);

return [

    /*
     * Dominios desde los que Sanctum acepta cookies stateful (cross-subdomain).
     * Debe incluir el root domain con wildcard para soportar `acme.interna.app`,
     * `panda.interna.app`, etc.
     */
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', 'localhost,localhost:3000,127.0.0.1,127.0.0.1:8000,*.interna.app,interna.app,*.interna.test,interna.test')),

    'guard' => ['web'],

    'expiration' => null,  // no expiran los PATs por default; el token de sesión sí tiene TTL

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', 'int_live_'),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'verify_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];

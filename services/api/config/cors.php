<?php

declare(strict_types=1);

// Orígenes whitelisted estáticos. FRONTEND_URL del env se appendea al final
// para no tener que tocar este archivo cuando cambia el dominio del front
// (Vercel / dominio custom).
$origins = array_filter([
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://interna.test:3000',
    env('FRONTEND_URL'),
]);

// Extra orígenes coma-separados desde CORS_EXTRA_ORIGINS — escape hatch
// para preview deployments con dominios no patroneables.
$extra = env('CORS_EXTRA_ORIGINS');
if (is_string($extra) && $extra !== '') {
    $origins = array_merge($origins, array_map('trim', explode(',', $extra)));
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout', 'broadcasting/auth'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_unique($origins)),
    'allowed_origins_patterns' => [
        '#^http://[a-z0-9-]+\.interna\.test(:\d+)?$#',
        // Permite cualquier puerto local en dev — útil cuando 3000 está
        // ocupado por otro proyecto y se corre Next.js en otro puerto.
        // En producción este patrón NO matchea (los dominios no son localhost).
        '#^http://(localhost|127\.0\.0\.1):\d+$#',
        // Vercel: deployment estable + preview deployments (*-{hash}.vercel.app).
        '#^https://[a-z0-9-]+\.vercel\.app$#',
        // Subdominios custom de senda.com / interna.app por si los activamos.
        '#^https://[a-z0-9-]+\.senda\.com$#',
        '#^https://[a-z0-9-]+\.interna\.app$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

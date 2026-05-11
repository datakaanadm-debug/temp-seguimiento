<?php

declare(strict_types=1);

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'logout'],
    'allowed_methods' => ['*'],
    'allowed_origins' => [
        'http://127.0.0.1:3000',
        'http://localhost:3000',
        'http://interna.test:3000',
    ],
    'allowed_origins_patterns' => [
        '#^http://[a-z0-9-]+\.interna\.test(:\d+)?$#',
        // Permite cualquier puerto local en dev — útil cuando 3000 está
        // ocupado por otro proyecto y se corre Next.js en otro puerto.
        // En producción este patrón NO matchea (los dominios no son localhost).
        '#^http://(localhost|127\.0\.0\.1):\d+$#',
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

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
    ],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];

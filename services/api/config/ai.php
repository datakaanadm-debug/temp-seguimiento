<?php

declare(strict_types=1);

return [
    /*
     * Proveedor LLM activo. 'claude' es el único MVP; fase 2 añade 'openai' o 'self_hosted'.
     */
    'provider' => env('AI_PROVIDER', 'claude'),

    /*
     * Dimensiones de vector para embeddings (pgvector).
     * Debe coincidir con el modelo de embeddings usado.
     */
    'embedding_dimensions' => (int) env('AI_EMBEDDING_DIMENSIONS', 1536),

    /*
     * Modelo default si no se especifica en el request.
     */
    'default_model' => env('AI_DEFAULT_MODEL', 'claude-sonnet-4-6'),

    /*
     * Kill switch global — desactiva IA para todos los tenants si está en true.
     * Útil para incidentes con el proveedor.
     */
    'globally_disabled' => (bool) env('AI_GLOBALLY_DISABLED', false),

    /*
     * Budget soft (USD/mes) — logs alerta si se acerca. NO es hard stop.
     */
    'monthly_budget_usd' => (float) env('AI_MONTHLY_BUDGET_USD', 500),
];

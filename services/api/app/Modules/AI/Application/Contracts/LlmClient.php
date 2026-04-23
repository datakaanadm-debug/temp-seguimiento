<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Contracts;

/**
 * Capa de abstracción sobre proveedores LLM. MVP: ClaudeLlmClient (Anthropic).
 * Cambiar a otro proveedor = nueva implementación + binding en service provider.
 */
interface LlmClient
{
    public function call(LlmRequest $request): LlmResponse;
}

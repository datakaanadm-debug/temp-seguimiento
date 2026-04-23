<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Contracts;

use App\Modules\AI\Domain\Enums\LlmModel;

/**
 * Value object de entrada. Inmutable. La infraestructura lo convierte al formato del vendor.
 */
final readonly class LlmRequest
{
    /**
     * @param array<int, array{role: 'user'|'assistant', content: string}> $messages
     * @param array<string, mixed> $metadata     para logging/telemetry (kind, subject_id, etc.)
     */
    public function __construct(
        public LlmModel $model,
        public string $systemPrompt,
        public array $messages,
        public int $maxTokens = 2048,
        public float $temperature = 0.7,
        public bool $cacheSystem = true,   // usar prompt caching de Anthropic
        public array $metadata = [],
    ) {}
}

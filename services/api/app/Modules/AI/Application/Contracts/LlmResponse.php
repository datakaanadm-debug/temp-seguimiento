<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Contracts;

use App\Modules\AI\Domain\Enums\LlmModel;

final readonly class LlmResponse
{
    public function __construct(
        public LlmModel $model,
        public string $content,
        public int $promptTokens,
        public int $completionTokens,
        public int $latencyMs,
        public float $costUsd,
        public bool $cacheHit = false,
    ) {}
}

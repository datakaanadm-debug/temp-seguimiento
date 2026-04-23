<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Enums;

/**
 * Modelos Claude soportados. Price per 1K tokens (input / output) en USD.
 * Actualizar valores cuando Anthropic publique cambios.
 */
enum LlmModel: string
{
    case ClaudeSonnet = 'claude-sonnet-4-6';
    case ClaudeHaiku = 'claude-haiku-4-5-20251001';
    case ClaudeOpus = 'claude-opus-4-7';

    public function inputPricePer1K(): float
    {
        return match ($this) {
            self::ClaudeSonnet => 0.003,
            self::ClaudeHaiku => 0.0008,
            self::ClaudeOpus => 0.015,
        };
    }

    public function outputPricePer1K(): float
    {
        return match ($this) {
            self::ClaudeSonnet => 0.015,
            self::ClaudeHaiku => 0.004,
            self::ClaudeOpus => 0.075,
        };
    }

    public function estimateCostUsd(int $promptTokens, int $completionTokens): float
    {
        return round(
            ($promptTokens / 1000) * $this->inputPricePer1K()
            + ($completionTokens / 1000) * $this->outputPricePer1K(),
            4
        );
    }

    public function maxOutputTokens(): int
    {
        return 4096;
    }
}

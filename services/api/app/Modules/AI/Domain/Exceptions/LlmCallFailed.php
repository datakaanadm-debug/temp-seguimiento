<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Exceptions;

use RuntimeException;

final class LlmCallFailed extends RuntimeException
{
    public static function timeout(): self
    {
        return new self('LLM call timed out.');
    }

    public static function httpError(int $status, string $message): self
    {
        return new self("LLM API returned {$status}: {$message}");
    }

    public static function missingApiKey(): self
    {
        return new self('ANTHROPIC_API_KEY is not configured.');
    }

    public static function malformedResponse(string $detail = ''): self
    {
        return new self("LLM response was malformed. {$detail}");
    }
}

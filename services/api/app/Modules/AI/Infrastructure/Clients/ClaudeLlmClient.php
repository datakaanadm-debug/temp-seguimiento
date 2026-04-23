<?php

declare(strict_types=1);

namespace App\Modules\AI\Infrastructure\Clients;

use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Contracts\LlmResponse;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Cliente Claude sobre HTTP. Usa `Http` facade (sin SDK) para que actualizar versiones
 * de la API de Anthropic no requiera un composer update coordinado.
 *
 * Soporta prompt caching de Anthropic (`cache_control: ephemeral`) — reduce costo 90%
 * en system prompts estables reutilizados varias veces en 5 min.
 */
final class ClaudeLlmClient implements LlmClient
{
    private const ENDPOINT = 'https://api.anthropic.com/v1/messages';
    private const API_VERSION = '2023-06-01';
    private const TIMEOUT_SECONDS = 60;

    public function __construct(
        private readonly ?string $apiKey = null,
    ) {}

    public function call(LlmRequest $request): LlmResponse
    {
        $apiKey = $this->apiKey ?? config('services.anthropic.api_key');
        if (!$apiKey) {
            throw LlmCallFailed::missingApiKey();
        }

        $payload = [
            'model' => $request->model->value,
            'max_tokens' => $request->maxTokens,
            'temperature' => $request->temperature,
            'system' => $request->cacheSystem
                ? [[
                    'type' => 'text',
                    'text' => $request->systemPrompt,
                    'cache_control' => ['type' => 'ephemeral'],
                ]]
                : $request->systemPrompt,
            'messages' => array_map(
                fn ($m) => ['role' => $m['role'], 'content' => $m['content']],
                $request->messages,
            ),
        ];

        $startedAt = microtime(true);

        try {
            $response = Http::withHeaders([
                    'x-api-key' => $apiKey,
                    'anthropic-version' => self::API_VERSION,
                    'content-type' => 'application/json',
                ])
                ->timeout(self::TIMEOUT_SECONDS)
                ->connectTimeout(10)
                ->retry(2, 500, fn ($e, $req) => $e instanceof ConnectionException)
                ->post(self::ENDPOINT, $payload);
        } catch (ConnectionException $e) {
            throw LlmCallFailed::timeout();
        }

        $latencyMs = (int) round((microtime(true) - $startedAt) * 1000);

        if (!$response->successful()) {
            throw LlmCallFailed::httpError(
                $response->status(),
                $response->body(),
            );
        }

        $json = $response->json();
        $text = $this->extractText($json);
        $usage = $json['usage'] ?? [];

        $promptTokens = (int) ($usage['input_tokens'] ?? 0)
            + (int) ($usage['cache_creation_input_tokens'] ?? 0)
            + (int) ($usage['cache_read_input_tokens'] ?? 0);
        $completionTokens = (int) ($usage['output_tokens'] ?? 0);
        $cacheHit = (int) ($usage['cache_read_input_tokens'] ?? 0) > 0;

        $cost = $request->model->estimateCostUsd($promptTokens, $completionTokens);

        return new LlmResponse(
            model: $request->model,
            content: $text,
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            latencyMs: $latencyMs,
            costUsd: $cost,
            cacheHit: $cacheHit,
        );
    }

    private function extractText(array $json): string
    {
        $content = $json['content'] ?? [];
        if (!is_array($content) || empty($content)) {
            throw LlmCallFailed::malformedResponse('empty content');
        }
        $parts = [];
        foreach ($content as $block) {
            if (($block['type'] ?? null) === 'text' && isset($block['text'])) {
                $parts[] = $block['text'];
            }
        }
        if (empty($parts)) {
            throw LlmCallFailed::malformedResponse('no text blocks');
        }
        return trim(implode("\n", $parts));
    }
}

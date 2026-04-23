<?php

declare(strict_types=1);

namespace App\Modules\AI\Application\Services;

use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Contracts\LlmResponse;
use App\Modules\AI\Domain\AiRequestLog;
use App\Modules\AI\Domain\Enums\LlmModel;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use App\Shared\Cache\TenantCache;
use App\Shared\Tenancy\TenantContext;
use Throwable;

/**
 * Gateway que envuelve al LlmClient con:
 *   - QuotaGuard (feature flag + cuota diaria).
 *   - Redis cache por hash de (prompt+input) — respuestas deterministas cache 24h.
 *   - Logging estructurado en ai_request_log.
 *   - Manejo de errores sin romper el flujo de aplicación (devuelve null en error no fatal).
 */
final class LlmGateway
{
    public function __construct(
        private readonly LlmClient $client,
        private readonly QuotaGuard $quota,
    ) {}

    /**
     * @param string $cacheKeyHint  forma parte del hash para segmentar cache
     * @param int $cacheTtlSeconds  0 = no cache
     */
    public function call(
        LlmRequest $request,
        string $cacheKeyHint = '',
        int $cacheTtlSeconds = 86_400,
    ): LlmResponse {
        $tenantId = TenantContext::currentId();
        $kind = (string) ($request->metadata['kind'] ?? 'generic');

        // 1. Cache por hash del payload + hint
        $cacheKey = null;
        if ($cacheTtlSeconds > 0) {
            $cacheKey = 'ai:resp:' . $kind . ':' . hash('sha256', json_encode([
                $request->model->value,
                $request->systemPrompt,
                $request->messages,
                $request->temperature,
                $cacheKeyHint,
            ]));
            /** @var ?array $cached */
            $cached = TenantCache::get($cacheKey);
            if ($cached !== null) {
                $this->logRequest($tenantId, $kind, $request->model, status: 'cached', cacheHit: true);
                return new LlmResponse(
                    model: LlmModel::from($cached['model']),
                    content: $cached['content'],
                    promptTokens: (int) $cached['prompt_tokens'],
                    completionTokens: (int) $cached['completion_tokens'],
                    latencyMs: 0,
                    costUsd: 0.0,
                    cacheHit: true,
                );
            }
        }

        // 2. Cuota
        $this->quota->ensureAllowed();

        // 3. Llamada real
        try {
            $response = $this->client->call($request);
        } catch (Throwable $e) {
            $this->logRequest($tenantId, $kind, $request->model, status: 'error', errorMessage: $e->getMessage());
            $this->quota->invalidateCounter($tenantId);
            if ($e instanceof LlmCallFailed) {
                throw $e;
            }
            throw new LlmCallFailed($e->getMessage(), previous: $e);
        }

        // 4. Persistir log + contador
        $this->logRequest(
            tenantId: $tenantId,
            kind: $kind,
            model: $response->model,
            status: 'success',
            promptTokens: $response->promptTokens,
            completionTokens: $response->completionTokens,
            costUsd: $response->costUsd,
            latencyMs: $response->latencyMs,
            cacheHit: $response->cacheHit,
        );
        $this->quota->invalidateCounter($tenantId);

        // 5. Guardar en cache
        if ($cacheKey && $cacheTtlSeconds > 0) {
            TenantCache::put($cacheKey, [
                'model' => $response->model->value,
                'content' => $response->content,
                'prompt_tokens' => $response->promptTokens,
                'completion_tokens' => $response->completionTokens,
            ], $cacheTtlSeconds);
        }

        return $response;
    }

    private function logRequest(
        string $tenantId,
        string $kind,
        LlmModel $model,
        string $status,
        ?int $promptTokens = null,
        ?int $completionTokens = null,
        ?float $costUsd = null,
        ?int $latencyMs = null,
        bool $cacheHit = false,
        ?string $errorMessage = null,
    ): void {
        AiRequestLog::create([
            'tenant_id' => $tenantId,
            'user_id' => auth()->id(),
            'model' => $model->value,
            'kind' => $kind,
            'prompt_tokens' => $promptTokens,
            'completion_tokens' => $completionTokens,
            'cost_usd' => $costUsd,
            'latency_ms' => $latencyMs,
            'status' => $status,
            'cache_hit' => $cacheHit,
            'error_message' => $errorMessage,
            'created_at' => now(),
        ]);
    }
}

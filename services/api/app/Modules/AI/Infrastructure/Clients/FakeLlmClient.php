<?php

declare(strict_types=1);

namespace App\Modules\AI\Infrastructure\Clients;

use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Contracts\LlmResponse;

/**
 * Cliente LLM de desarrollo/local cuando no hay ANTHROPIC_API_KEY.
 *
 * Devuelve respuestas plausibles basadas en el `kind` del metadata
 * (ver SummarizeDailyReport, GenerateEvaluationNarrative, Chat, etc).
 * Permite probar el flujo end-to-end sin pegar a la API real.
 *
 * NO usar en producción — el binding se decide en AppServiceProvider según env.
 */
final class FakeLlmClient implements LlmClient
{
    public function call(LlmRequest $request): LlmResponse
    {
        $kind = (string) ($request->metadata['kind'] ?? 'generic');
        $lastUser = '';
        foreach (array_reverse($request->messages) as $m) {
            if (($m['role'] ?? null) === 'user') {
                $lastUser = (string) ($m['content'] ?? '');
                break;
            }
        }

        $content = match (true) {
            str_contains($kind, 'daily_summary') => $this->dailySummary($lastUser),
            str_contains($kind, 'evaluation') => $this->evaluationNarrative($lastUser),
            str_contains($kind, 'chat') => $this->chatReply($lastUser),
            default => 'Respuesta de desarrollo (FakeLlmClient). Configura ANTHROPIC_API_KEY en .env para habilitar IA real.',
        };

        return new LlmResponse(
            model: $request->model,
            content: $content,
            promptTokens: max(50, (int) (strlen($request->systemPrompt) / 4)),
            completionTokens: max(40, (int) (strlen($content) / 4)),
            latencyMs: random_int(150, 600),
            costUsd: 0.0,
        );
    }

    private function dailySummary(string $userInput): string
    {
        $snippet = mb_substr(trim($userInput), 0, 240);
        return "Resumen del día (modo desarrollo):\n\n"
            . "• " . ($snippet !== '' ? $snippet : 'Sin avances registrados hoy.') . "\n"
            . "• Sin bloqueos reportados.\n"
            . "• El siguiente paso es continuar con las tareas planificadas.\n\n"
            . "Tono: equilibrado. Para resúmenes reales configura ANTHROPIC_API_KEY en el .env.";
    }

    private function evaluationNarrative(string $userInput): string
    {
        return "Narrativa de evaluación (modo desarrollo):\n\n"
            . "Durante el periodo evaluado se observan avances consistentes en entregables, "
            . "buena comunicación con el equipo y apertura al feedback. Se recomienda profundizar "
            . "en habilidades de planificación y priorización para el próximo ciclo.\n\n"
            . "(Texto generado por FakeLlmClient — reemplazar con IA real configurando el API key.)";
    }

    private function chatReply(string $userInput): string
    {
        $snippet = mb_substr(trim($userInput), 0, 160);
        return "Estás en modo desarrollo (sin API key de IA). "
            . "Cuando configures ANTHROPIC_API_KEY obtendrás respuestas reales basadas en tu contexto "
            . "(tareas, bitácoras, evaluaciones, OKRs).\n\n"
            . ($snippet !== '' ? "Detecté que preguntaste: \"{$snippet}\". " : '')
            . "¿Quieres que te ayude con una acción rápida (resumir tu día, revisar prioridades, redactar una nota)?";
    }
}

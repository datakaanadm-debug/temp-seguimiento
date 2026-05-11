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
        // ANTES echaba `$userInput` (que es el prompt completo con el JSON crudo
        // del reporte) como bullet — exponía el payload técnico al usuario en la
        // UI de /ia. Ahora generamos un stub determinístico que NO refleja el
        // input, solo confirma que el flow funciona.
        //
        // Extraemos solo `avances` del JSON si está disponible para hacer el
        // stub un poco contextual, sin dumpear todo el prompt.
        $avances = $this->extractField($userInput, 'avances');
        $emocional = $this->extractField($userInput, 'estado_emocional');

        $bullets = [];
        $bullets[] = $avances !== ''
            ? "Trabajaste en: " . mb_substr($avances, 0, 120)
            : 'Sin avances registrados hoy.';
        $bullets[] = 'Sin bloqueos reportados.';
        $bullets[] = 'El siguiente paso es continuar con las tareas planificadas.';

        $tono = match ($emocional) {
            'great', 'good' => 'positivo',
            'stressed' => 'preocupado · revisar carga',
            'blocked' => 'frustrado · escalar bloqueos',
            default => 'equilibrado',
        };

        return "Resumen del día (modo desarrollo):\n\n"
            . "• " . $bullets[0] . "\n"
            . "• " . $bullets[1] . "\n"
            . "• " . $bullets[2] . "\n\n"
            . "Tono: {$tono}. Configura ANTHROPIC_API_KEY en el .env para resúmenes con IA real.";
    }

    /**
     * Extrae el valor de un campo JSON del prompt sin parsear todo. Heurística
     * suficiente para el FakeLlmClient — en prod la IA real recibe estructura.
     */
    private function extractField(string $haystack, string $field): string
    {
        if (preg_match('/"' . preg_quote($field, '/') . '"\s*:\s*"([^"]*)"/', $haystack, $m)) {
            return trim($m[1]);
        }
        return '';
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

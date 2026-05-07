<?php

declare(strict_types=1);

namespace App\Modules\AI\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Application\Contracts\LlmRequest;
use App\Modules\AI\Application\Services\LlmGateway;
use App\Modules\AI\Domain\Enums\LlmModel;
use App\Modules\AI\Domain\Exceptions\AiQuotaExceeded;
use App\Modules\AI\Domain\Exceptions\LlmCallFailed;
use App\Shared\Tenancy\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class ChatController extends Controller
{
    public function __construct(
        private readonly LlmGateway $gateway,
    ) {}

    /**
     * POST /api/v1/ai/chat
     *
     * Recibe un arreglo de mensajes (historial) y devuelve la respuesta del asistente.
     * Incluye contexto breve del usuario: role, bitácora de hoy, tareas activas,
     * próximos eventos — para que el modelo dé respuestas relevantes.
     */
    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'messages' => ['required', 'array', 'min:1', 'max:20'],
            'messages.*.role' => ['required', 'in:user,assistant'],
            'messages.*.content' => ['required', 'string', 'max:4000'],
            'current_route' => ['nullable', 'string', 'max:120'],
        ]);

        $user = $request->user();
        $tenantId = TenantContext::currentId();

        try {
            $contextBlock = $this->buildContextBlock($user, $tenantId);
        } catch (\Throwable) {
            $contextBlock = '';
        }

        $systemPrompt = <<<PROMPT
Eres el copiloto IA de Senda, una plataforma de gestión de practicantes en LATAM.
Respondes en español, conciso (máximo 150 palabras), orientado a accionable.
Sugieres pasos concretos sobre la plataforma (rutas /mi-dia, /tareas, /mentoria, /okrs, /logros, /onboarding, /reportes-diarios).

Rol del usuario: {$user->primaryRole()?->value}
Ruta actual: {$data['current_route']}

Contexto del usuario (últimas 24h):
{$contextBlock}

Si no tienes información suficiente para una respuesta precisa, dilo y sugiere dónde encontrarla.
PROMPT;

        try {
            $response = $this->gateway->call(
                request: new LlmRequest(
                    model: LlmModel::ClaudeHaiku,
                    systemPrompt: $systemPrompt,
                    messages: $data['messages'],
                    maxTokens: 600,
                    temperature: 0.5,
                    metadata: ['kind' => 'chat'],
                ),
                cacheKeyHint: 'chat:' . $user->id,
                cacheTtlSeconds: 0, // chat no se cachea
            );
        } catch (AiQuotaExceeded|LlmCallFailed $e) {
            throw ValidationException::withMessages(['ai' => $e->getMessage()])->status(429);
        }

        return response()->json([
            'data' => [
                'role' => 'assistant',
                'content' => $response->content,
                'model' => $response->model->value,
            ],
        ]);
    }

    private function buildContextBlock(object $user, string $tenantId): string
    {
        $lines = [];

        // Bitácora de hoy
        $report = DB::table('daily_reports')
            ->where('tenant_id', $tenantId)
            ->where('user_id', $user->id)
            ->whereDate('report_date', now()->toDateString())
            ->first();
        if ($report) {
            $lines[] = 'Bitácora de hoy: ' . mb_substr((string) $report->progress_summary, 0, 220);
        } else {
            $lines[] = 'Bitácora de hoy: no reportada aún.';
        }

        // Tareas activas (máx 5)
        $tasks = DB::table('tasks')
            ->where('tenant_id', $tenantId)
            ->where('assignee_id', $user->id)
            ->whereNotIn('state', ['DONE', 'CANCELLED'])
            ->orderBy('priority_weight', 'desc')
            ->orderBy('due_at')
            ->limit(5)
            ->get(['title', 'state', 'priority', 'due_at']);
        if ($tasks->count() > 0) {
            $lines[] = 'Tareas activas:';
            foreach ($tasks as $t) {
                $due = $t->due_at ? ' (vence ' . substr((string) $t->due_at, 0, 10) . ')' : '';
                $lines[] = "- [{$t->priority}] {$t->title} · {$t->state}{$due}";
            }
        }

        // Próximas sesiones de mentoría (máx 3)
        $sessions = DB::table('mentor_sessions')
            ->where('tenant_id', $tenantId)
            ->where(function ($q) use ($user) {
                $q->where('intern_user_id', $user->id)->orWhere('mentor_user_id', $user->id);
            })
            ->where('scheduled_at', '>=', now())
            ->where('status', 'scheduled')
            ->orderBy('scheduled_at')
            ->limit(3)
            ->get(['topic', 'scheduled_at']);
        if ($sessions->count() > 0) {
            $lines[] = 'Próximas 1:1:';
            foreach ($sessions as $s) {
                $lines[] = "- {$s->topic} el " . substr((string) $s->scheduled_at, 0, 16);
            }
        }

        return implode("\n", $lines);
    }
}

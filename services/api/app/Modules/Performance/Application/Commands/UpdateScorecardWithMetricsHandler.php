<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Scorecard;
use App\Modules\Performance\Domain\ScorecardMetric;
use Illuminate\Support\Facades\DB;

/**
 * Reemplaza completamente las métricas de un scorecard. Se usa cuando el
 * admin edita un scorecard existente desde /configuracion/scorecards y
 * agrega/quita métricas.
 *
 * NOTA: las métricas tienen FK desde EvaluationResponse. Si una evaluación
 * existente referencia una métrica que estamos por borrar, fallaría el FK.
 * Estrategia simple: dejamos que falle con DB exception (raro porque las
 * métricas ya respondidas suelen estar en evaluaciones finalizadas que el
 * admin no necesita rehacer). Si se vuelve común, hacer SOFT DELETE de
 * métricas en lugar de hard delete.
 */
final class UpdateScorecardWithMetricsHandler
{
    /**
     * @param  array{name?:string,description?:?string,is_active?:bool,metrics?:array<int,array<string,mixed>>}  $changes
     */
    public function handle(string $scorecardId, array $changes): Scorecard
    {
        return DB::transaction(function () use ($scorecardId, $changes) {
            /** @var Scorecard $scorecard */
            $scorecard = Scorecard::query()->findOrFail($scorecardId);

            foreach (['name', 'description', 'is_active'] as $field) {
                if (array_key_exists($field, $changes)) {
                    $scorecard->{$field} = $changes[$field];
                }
            }
            $scorecard->save();

            if (array_key_exists('metrics', $changes) && is_array($changes['metrics'])) {
                // Estrategia: detach + create. Mantiene IDs frescas y simplifica
                // el handler — la complejidad de "upsert por key" no vale la pena
                // por ahora (las evaluaciones existentes ya guardaron sus
                // respuestas con FK al metric_id viejo, y queremos preservarlas
                // si la métrica permanece con el mismo `key`).
                $existing = $scorecard->metrics()->get()->keyBy('key');
                $keptKeys = [];

                foreach ($changes['metrics'] as $i => $row) {
                    $key = (string) ($row['key'] ?? '');
                    if ($key === '') continue;
                    $keptKeys[] = $key;

                    $payload = [
                        'key' => $key,
                        'label' => (string) ($row['label'] ?? $key),
                        'type' => (string) ($row['type'] ?? 'manual'),
                        'source' => $row['source'] ?? null,
                        'target_value' => $row['target_value'] ?? null,
                        'unit' => $row['unit'] ?? null,
                        'weight' => (float) ($row['weight'] ?? 1.0),
                        'config' => (array) ($row['config'] ?? []),
                        'position' => (int) ($row['position'] ?? $i),
                    ];

                    if ($existing->has($key)) {
                        // Update preserva el id → no rompe FK de EvaluationResponse
                        $existing[$key]->update($payload);
                    } else {
                        ScorecardMetric::create(array_merge($payload, [
                            'scorecard_id' => $scorecard->id,
                        ]));
                    }
                }

                // Borrar métricas que ya no están en el payload
                foreach ($existing as $key => $metric) {
                    if (!in_array($key, $keptKeys, true)) {
                        $metric->delete();
                    }
                }
            }

            return $scorecard->fresh('metrics');
        });
    }
}

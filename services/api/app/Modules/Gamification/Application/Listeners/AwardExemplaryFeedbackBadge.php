<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Application\Listeners;

use App\Modules\Gamification\Application\GamificationService;
use App\Modules\Performance\Domain\Enums\EvaluationKind;
use App\Modules\Performance\Domain\Events\EvaluationSubmitted;

/**
 * Listener: cuando un evaluador SUBMIT una evaluación, si:
 *   - kind === '30d' (evaluación de los primeros 30 días)
 *   - overall_score >= 8.5 / 10
 *
 * → otorga `exemplary-feedback` (gold, +120 pts) al `subject_user_id`
 *   (la persona evaluada, NO al evaluador).
 *
 * Threshold de 8.5 es subjetivo — lo elegí como "claramente sobresaliente".
 * Si quieres ajustar (ej. 9.0 más estricto, 8.0 más generoso) cambia
 * la constante. Idealmente vendría de tenant settings.
 */
final class AwardExemplaryFeedbackBadge
{
    private const SCORE_THRESHOLD = 8.5;

    public function __construct(private GamificationService $g) {}

    public function handle(EvaluationSubmitted $event): void
    {
        $eval = $event->evaluation;

        // `kind` está casteado al enum EvaluationKind por el modelo
        if ($eval->kind !== EvaluationKind::D30) return;
        if ($eval->overall_score === null) return;
        if ((float) $eval->overall_score < self::SCORE_THRESHOLD) return;

        $subjectId = $eval->subject_user_id ?? null;
        if (!$subjectId) return;

        $this->g->awardBadge($subjectId, 'exemplary-feedback');
    }
}

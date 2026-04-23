<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Enums;

enum InsightKind: string
{
    case RiskOfDelay = 'risk_of_delay';
    case PatternBlocked = 'pattern_blocked';
    case LowActivity = 'low_activity';
    case Standout = 'standout';
    case EvaluationRisk = 'evaluation_risk';
    case DropoutRisk = 'dropout_risk';
    case MentorMatchSuggestion = 'mentor_match_suggestion';

    public function label(): string
    {
        return match ($this) {
            self::RiskOfDelay => 'Riesgo de retraso',
            self::PatternBlocked => 'Patrón de bloqueo',
            self::LowActivity => 'Baja actividad',
            self::Standout => 'Desempeño destacado',
            self::EvaluationRisk => 'Riesgo en evaluación',
            self::DropoutRisk => 'Riesgo de deserción',
            self::MentorMatchSuggestion => 'Sugerencia de mentor',
        };
    }
}

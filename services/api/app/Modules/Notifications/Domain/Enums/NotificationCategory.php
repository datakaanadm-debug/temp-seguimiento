<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Domain\Enums;

enum NotificationCategory: string
{
    case TaskAssigned = 'task_assigned';
    case TaskMentioned = 'task_mentioned';
    case TaskDueSoon = 'task_due_soon';
    case TaskOverdue = 'task_overdue';
    case CommentMentioned = 'comment_mentioned';
    case BlockerRaised = 'blocker_raised';
    case EvaluationScheduled = 'evaluation_scheduled';
    case EvaluationSubmitted = 'evaluation_submitted';
    case DailyDigest = 'daily_digest';
    case WeeklyDigest = 'weekly_digest';

    public function label(): string
    {
        return match ($this) {
            self::TaskAssigned => 'Te asignaron una tarea',
            self::TaskMentioned => 'Te mencionaron en una tarea',
            self::TaskDueSoon => 'Tarea próxima a vencer',
            self::TaskOverdue => 'Tarea vencida',
            self::CommentMentioned => 'Te mencionaron en un comentario',
            self::BlockerRaised => 'Se reportó un bloqueo',
            self::EvaluationScheduled => 'Evaluación programada',
            self::EvaluationSubmitted => 'Evaluación enviada',
            self::DailyDigest => 'Resumen diario',
            self::WeeklyDigest => 'Resumen semanal',
        };
    }
}

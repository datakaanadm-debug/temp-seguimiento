<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class ScheduleEvaluation
{
    public function __construct(
        public string $scorecardId,
        public string $subjectUserId,
        public string $kind,              // '30d'|'60d'|'90d'|'adhoc'|'360'|...
        public string $scheduledFor,      // YYYY-MM-DD
        public ?string $evaluatorUserId = null,
        public ?User $actor = null,
    ) {}
}

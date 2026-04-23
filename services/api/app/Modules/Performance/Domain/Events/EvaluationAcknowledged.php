<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Evaluation;
use App\Shared\Events\DomainEvent;

final class EvaluationAcknowledged extends DomainEvent
{
    public function __construct(
        public readonly Evaluation $evaluation,
        public readonly User $subject,
    ) {
        parent::__construct();
    }
}

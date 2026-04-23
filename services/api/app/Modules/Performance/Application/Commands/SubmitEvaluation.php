<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class SubmitEvaluation
{
    public function __construct(
        public string $evaluationId,
        public User $evaluator,
    ) {}
}

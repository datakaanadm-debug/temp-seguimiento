<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Evaluation;

final readonly class EvaluationDisputed
{
    public function __construct(
        public Evaluation $evaluation,
        public User $subject,
        public ?string $reason,
    ) {}
}

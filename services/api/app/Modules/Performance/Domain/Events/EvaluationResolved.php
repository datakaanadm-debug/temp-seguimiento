<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Events;

use App\Modules\Identity\Domain\User;
use App\Modules\Performance\Domain\Evaluation;

final readonly class EvaluationResolved
{
    public function __construct(
        public Evaluation $evaluation,
        public User $resolver,
        public ?string $resolution,
    ) {}
}

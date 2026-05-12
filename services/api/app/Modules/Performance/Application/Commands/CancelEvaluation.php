<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CancelEvaluation
{
    public function __construct(
        public string $evaluationId,
        public User $actor,
        public ?string $reason = null,
    ) {}
}

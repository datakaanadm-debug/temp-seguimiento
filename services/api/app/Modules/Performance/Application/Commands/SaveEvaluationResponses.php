<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class SaveEvaluationResponses
{
    /**
     * @param array<string, array{value_numeric?:?float, value_text?:?string, value_json?:?array}> $responses
     *        key = metric_id
     */
    public function __construct(
        public string $evaluationId,
        public User $evaluator,
        public array $responses,
        public ?string $narrative = null,
        public ?float $overallScore = null,
    ) {}
}

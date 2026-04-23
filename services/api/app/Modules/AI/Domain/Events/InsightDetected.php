<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Events;

use App\Modules\AI\Domain\AiInsight;
use App\Shared\Events\DomainEvent;

final class InsightDetected extends DomainEvent
{
    public function __construct(
        public readonly AiInsight $insight,
    ) {
        parent::__construct();
    }
}

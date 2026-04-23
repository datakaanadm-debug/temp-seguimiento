<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain\Events;

use App\Modules\AI\Domain\AiSummary;
use App\Shared\Events\DomainEvent;

final class SummaryGenerated extends DomainEvent
{
    public function __construct(
        public readonly AiSummary $summary,
    ) {
        parent::__construct();
    }
}

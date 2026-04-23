<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain\Enums;

enum RunStatus: string
{
    case Queued = 'queued';
    case Running = 'running';
    case Completed = 'completed';
    case Failed = 'failed';
    case Expired = 'expired';

    public function isTerminal(): bool
    {
        return in_array($this, [self::Completed, self::Failed, self::Expired], true);
    }
}

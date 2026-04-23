<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain\Enums;

enum MetricType: string
{
    case Auto = 'auto';
    case Manual = 'manual';
    case Likert = 'likert';
    case Rubric = 'rubric';

    public function isAutoComputable(): bool
    {
        return $this === self::Auto;
    }
}

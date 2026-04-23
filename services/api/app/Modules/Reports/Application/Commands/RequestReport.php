<?php

declare(strict_types=1);

namespace App\Modules\Reports\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class RequestReport
{
    public function __construct(
        public string $templateId,
        public User $requester,
        public ?string $subjectType = null,
        public ?string $subjectId = null,
        public ?string $periodStart = null,
        public ?string $periodEnd = null,
        public array $parameters = [],
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CreateTask
{
    /**
     * @param list<string> $tagIds
     */
    public function __construct(
        public string $projectId,
        public string $title,
        public User $actor,
        public ?string $listId = null,
        public ?string $parentTaskId = null,
        public ?string $keyResultId = null,
        public ?string $description = null,
        public string $priority = 'normal',
        public ?string $assigneeId = null,
        public ?string $reviewerId = null,
        public ?string $dueAt = null,
        public ?int $estimatedMinutes = null,
        public array $tagIds = [],
    ) {}
}

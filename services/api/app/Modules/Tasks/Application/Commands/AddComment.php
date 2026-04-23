<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class AddComment
{
    public function __construct(
        public string $taskId,
        public User $author,
        public string $body,
        public ?string $parentCommentId = null,
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class DeleteAttachment
{
    public function __construct(
        public string $attachmentId,
        public User $actor,
    ) {}
}

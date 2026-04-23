<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class RegisterAttachment
{
    public function __construct(
        public string $taskId,
        public User $user,
        public string $storedKey,
        public string $originalName,
        public string $mimeType,
        public int $sizeBytes,
        public ?string $checksumSha256 = null,
    ) {}
}

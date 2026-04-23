<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Application\Commands;

use App\Modules\Tracking\Domain\Blocker;
use App\Modules\Tracking\Domain\Enums\BlockerStatus;
use App\Modules\Tracking\Domain\Events\BlockerResolved;
use Illuminate\Support\Facades\DB;

final class ResolveBlockerHandler
{
    public function handle(ResolveBlocker $command): Blocker
    {
        /** @var Blocker $blocker */
        $blocker = Blocker::query()->findOrFail($command->blockerId);

        if (!$blocker->status->isActive()) {
            return $blocker; // idempotente
        }

        DB::transaction(function () use ($blocker, $command) {
            $blocker->status = $command->dismiss ? BlockerStatus::Dismissed : BlockerStatus::Resolved;
            $blocker->resolved_at = now();
            $blocker->resolved_by = $command->resolver->id;
            $blocker->resolution = $command->resolution;
            $blocker->save();

            DB::afterCommit(fn () => event(new BlockerResolved($blocker, $command->resolver)));
        });

        return $blocker->fresh();
    }
}

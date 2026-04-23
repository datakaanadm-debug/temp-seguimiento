<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Performance\Domain\Scorecard;
use App\Modules\Performance\Domain\ScorecardMetric;
use Illuminate\Support\Facades\DB;

final class CreateScorecardHandler
{
    public function handle(CreateScorecard $command): Scorecard
    {
        return DB::transaction(function () use ($command) {
            $scorecard = Scorecard::create([
                'name' => $command->name,
                'description' => $command->description,
                'applicable_to' => $command->applicableTo,
                'is_active' => true,
            ]);

            foreach ($command->metrics as $i => $row) {
                ScorecardMetric::create([
                    'scorecard_id' => $scorecard->id,
                    'key' => $row['key'],
                    'label' => $row['label'],
                    'type' => $row['type'],
                    'source' => $row['source'] ?? null,
                    'target_value' => $row['target_value'] ?? null,
                    'unit' => $row['unit'] ?? null,
                    'weight' => $row['weight'] ?? 1.0,
                    'config' => $row['config'] ?? [],
                    'position' => $row['position'] ?? $i,
                ]);
            }

            return $scorecard->fresh('metrics');
        });
    }
}

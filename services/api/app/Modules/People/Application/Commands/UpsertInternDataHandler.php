<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\People\Domain\InternData;
use App\Modules\People\Domain\Profile;

final class UpsertInternDataHandler
{
    private const ALLOWED = [
        'university', 'career', 'semester',
        'mandatory_hours', 'hours_completed',
        'university_advisor', 'university_email', 'gpa',
    ];

    public function handle(UpsertInternData $command): InternData
    {
        /** @var Profile $profile */
        $profile = Profile::query()->findOrFail($command->profileId);

        $toUpsert = array_intersect_key($command->fields, array_flip(self::ALLOWED));

        /** @var InternData $data */
        $data = $profile->internData()->firstOrNew([]);
        $data->fill($toUpsert);

        if (!$data->exists) {
            $data->profile_id = $profile->id;
            // tenant_id lo setea BelongsToTenant
        }

        $data->save();

        return $data;
    }
}

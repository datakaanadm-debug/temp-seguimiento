<?php

declare(strict_types=1);

namespace App\Modules\People\Application\Commands;

use App\Modules\People\Domain\Events\ProfileUpdated;
use App\Modules\People\Domain\Profile;
use Illuminate\Support\Facades\DB;

final class UpdateProfileHandler
{
    /**
     * Campos whitelistados por esta capa (FormRequest ya validó tipos).
     * PII sensible se cifra automáticamente via casts del modelo.
     */
    private const ALLOWED_FIELDS = [
        'bio', 'phone', 'national_id', 'birth_date',
        'position_title', 'start_date', 'end_date',
        'kind', 'skills', 'social_links', 'emergency_contact',
    ];

    public function handle(UpdateProfile $command): Profile
    {
        /** @var Profile $profile */
        $profile = Profile::query()->findOrFail($command->profileId);

        $toUpdate = array_intersect_key(
            $command->fields,
            array_flip(self::ALLOWED_FIELDS)
        );

        if (empty($toUpdate)) {
            return $profile;
        }

        return DB::transaction(function () use ($profile, $toUpdate, $command) {
            $before = $profile->only(array_keys($toUpdate));

            $profile->fill($toUpdate);
            $profile->updated_by = $command->actor->id;
            $profile->save();

            $changes = [];
            foreach ($toUpdate as $k => $v) {
                $changes[$k] = ['from' => $before[$k] ?? null, 'to' => $profile->{$k}];
            }

            DB::afterCommit(function () use ($profile, $command, $changes) {
                event(new ProfileUpdated($profile, $command->actor, $changes));
            });

            return $profile;
        });
    }
}

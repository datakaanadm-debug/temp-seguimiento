<?php

declare(strict_types=1);

namespace App\Modules\People\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $profile_id
 * @property array $expertise
 * @property int $max_mentees
 * @property array $availability
 * @property ?\DateTimeInterface $certified_at
 */
class MentorData extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'mentor_data';

    protected $fillable = [
        'tenant_id',
        'profile_id',
        'expertise',
        'max_mentees',
        'availability',
        'certified_at',
    ];

    protected $casts = [
        'expertise' => 'array',
        'availability' => 'array',
        'max_mentees' => 'integer',
        'certified_at' => 'datetime',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }
}

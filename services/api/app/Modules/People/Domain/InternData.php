<?php

declare(strict_types=1);

namespace App\Modules\People\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Datos académicos y de convenio del practicante. 1:1 con Profile.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $profile_id
 * @property ?string $university
 * @property ?string $career
 * @property ?int $semester
 * @property ?int $mandatory_hours
 * @property int $hours_completed
 * @property ?string $university_advisor
 * @property ?string $university_email
 * @property ?string $gpa
 */
class InternData extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'intern_data';

    protected $fillable = [
        'tenant_id',
        'profile_id',
        'university',
        'career',
        'semester',
        'mandatory_hours',
        'hours_completed',
        'university_advisor',
        'university_email',
        'gpa',
    ];

    protected $casts = [
        'semester' => 'integer',
        'mandatory_hours' => 'integer',
        'hours_completed' => 'integer',
        'gpa' => 'decimal:2',
    ];

    public function profile(): BelongsTo
    {
        return $this->belongsTo(Profile::class);
    }

    public function progressPercent(): ?float
    {
        if (!$this->mandatory_hours || $this->mandatory_hours === 0) {
            return null;
        }
        return round(($this->hours_completed / $this->mandatory_hours) * 100, 2);
    }
}

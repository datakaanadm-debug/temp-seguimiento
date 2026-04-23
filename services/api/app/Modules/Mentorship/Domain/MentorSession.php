<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Domain;

use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $mentor_user_id
 * @property string $intern_user_id
 * @property \Carbon\Carbon $scheduled_at
 * @property int $duration_minutes
 * @property string $topic
 * @property array $agenda
 * @property ?string $location
 * @property string $status
 */
class MentorSession extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'mentor_sessions';

    protected $fillable = [
        'tenant_id',
        'mentor_user_id',
        'intern_user_id',
        'scheduled_at',
        'duration_minutes',
        'topic',
        'agenda',
        'location',
        'status',
        'started_at',
        'completed_at',
        'tags',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'agenda' => 'array',
        'tags' => 'array',
    ];

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentor_user_id');
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_user_id');
    }

    public function notes(): HasMany
    {
        return $this->hasMany(MentorNote::class, 'session_id');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\People\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\People\Domain\Enums\AssignmentStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Asignación mentor↔practicante con periodo y status.
 *
 * Constraint DB: un practicante solo puede tener 1 asignación activa (unique parcial WHERE status='active').
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $mentor_user_id
 * @property string $intern_user_id
 * @property \DateTimeInterface $started_at
 * @property ?\DateTimeInterface $ended_at
 * @property AssignmentStatus $status
 * @property ?string $notes
 */
class MentorAssignment extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'mentor_assignments';

    protected $fillable = [
        'tenant_id',
        'mentor_user_id',
        'intern_user_id',
        'started_at',
        'ended_at',
        'status',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'status' => AssignmentStatus::class,
        'started_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function mentor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'mentor_user_id');
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_user_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', AssignmentStatus::Active->value);
    }

    public function isActive(): bool
    {
        return $this->status === AssignmentStatus::Active;
    }
}

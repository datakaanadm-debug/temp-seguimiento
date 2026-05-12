<?php

declare(strict_types=1);

namespace App\Modules\Audit\Domain;

use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Inmutable. La tabla tiene REVOKE UPDATE/DELETE comentado en la migration
 * — sólo INSERT permitido. Lectura via index/show con filtros.
 *
 * @property string $id
 * @property string $tenant_id
 * @property ?string $log_name
 * @property ?string $description
 * @property ?string $subject_type
 * @property ?string $subject_id
 * @property ?string $causer_type
 * @property ?string $causer_id
 * @property ?string $event
 * @property ?array $properties
 * @property ?string $ip_address
 * @property ?string $user_agent
 * @property ?string $request_id
 * @property \Illuminate\Support\Carbon $created_at
 */
class ActivityLog extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'activity_log';
    protected $keyType = 'string';
    public $incrementing = false;
    public $timestamps = false;  // sólo created_at, no updated_at

    protected $fillable = [
        'tenant_id', 'log_name', 'description',
        'subject_type', 'subject_id',
        'causer_type', 'causer_id',
        'event', 'properties',
        'ip_address', 'user_agent', 'request_id',
        'created_at',
    ];

    protected $casts = [
        'properties' => 'array',
        'created_at' => 'datetime',
    ];

    /** Causer (quien hizo la acción) — típicamente un User. */
    public function causer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'causer_id');
    }
}

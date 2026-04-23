<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Reports\Domain\Enums\RunStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Exportaciones genéricas (CSV/JSON/XLSX) de resources.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $requested_by
 * @property string $resource     tasks|users|evaluations|...
 * @property string $format       csv|json|xlsx
 * @property ?array $filters
 * @property RunStatus $status
 * @property ?string $file_key
 * @property ?int $row_count
 */
class Export extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'exports';

    protected $fillable = [
        'tenant_id',
        'requested_by',
        'resource',
        'format',
        'filters',
        'status',
        'file_key',
        'row_count',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'status' => RunStatus::class,
        'filters' => 'array',
        'row_count' => 'integer',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}

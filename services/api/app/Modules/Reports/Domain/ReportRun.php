<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain;

use App\Modules\Identity\Domain\User;
use App\Modules\Reports\Domain\Enums\RunStatus;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property string $template_id
 * @property string $requested_by
 * @property ?string $subject_type     user|team|department|tenant
 * @property ?string $subject_id
 * @property ?\DateTimeInterface $period_start
 * @property ?\DateTimeInterface $period_end
 * @property ?array $parameters
 * @property RunStatus $status
 * @property ?string $file_key         path en R2
 * @property ?int $file_size_bytes
 * @property ?string $error_message
 * @property ?\DateTimeInterface $started_at
 * @property ?\DateTimeInterface $completed_at
 * @property ?\DateTimeInterface $expires_at
 */
class ReportRun extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'report_runs';

    protected $fillable = [
        'tenant_id',
        'template_id',
        'requested_by',
        'subject_type',
        'subject_id',
        'period_start',
        'period_end',
        'parameters',
        'status',
        'file_key',
        'file_size_bytes',
        'error_message',
        'started_at',
        'completed_at',
        'expires_at',
    ];

    protected $casts = [
        'status' => RunStatus::class,
        'parameters' => 'array',
        'period_start' => 'date',
        'period_end' => 'date',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    public function template(): BelongsTo
    {
        return $this->belongsTo(ReportTemplate::class, 'template_id');
    }

    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requested_by');
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Performance\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

/**
 * Snapshot agregado para dashboards. Una fila por (tenant, subject, metric, period, period_start).
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $subject_type       user|team|department|tenant
 * @property string $subject_id
 * @property string $metric_key
 * @property string $period             day|week|month|quarter|year
 * @property \DateTimeInterface $period_start
 * @property \DateTimeInterface $period_end
 * @property float $value
 * @property ?int $sample_size
 * @property \DateTimeInterface $computed_at
 */
class KpiSnapshot extends BaseModel
{
    use BelongsToTenant;

    public $timestamps = false;

    protected $table = 'kpi_snapshots';

    protected $fillable = [
        'tenant_id',
        'subject_type',
        'subject_id',
        'metric_key',
        'period',
        'period_start',
        'period_end',
        'value',
        'sample_size',
        'computed_at',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end' => 'date',
        'value' => 'decimal:4',
        'sample_size' => 'integer',
        'computed_at' => 'datetime',
    ];
}

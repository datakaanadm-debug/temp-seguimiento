<?php

declare(strict_types=1);

namespace App\Modules\Automation\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class AutomationRun extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'automation_runs';

    protected $fillable = [
        'tenant_id',
        'rule_id',
        'status',
        'payload',
        'note',
        'ran_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'ran_at' => 'datetime',
    ];
}

<?php

declare(strict_types=1);

namespace App\Modules\Automation\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class AutomationRule extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'automation_rules';

    protected $fillable = [
        'tenant_id',
        'title',
        'description',
        'trigger_kind',
        'trigger_config',
        'condition_config',
        'actions_config',
        'enabled',
        'runs_count',
        'last_run_at',
        'created_by',
    ];

    protected $casts = [
        'trigger_config' => 'array',
        'condition_config' => 'array',
        'actions_config' => 'array',
        'enabled' => 'boolean',
        'runs_count' => 'integer',
        'last_run_at' => 'datetime',
    ];
}

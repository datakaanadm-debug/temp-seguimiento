<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class GrowthGoal extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'growth_goals';

    protected $fillable = [
        'tenant_id',
        'intern_user_id',
        'text',
        'quarter',
        'done',
        'due_at',
        'completed_at',
    ];

    protected $casts = [
        'done' => 'boolean',
        'due_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
}

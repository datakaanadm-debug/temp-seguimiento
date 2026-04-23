<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class OnboardingItem extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'onboarding_items';

    protected $fillable = [
        'tenant_id',
        'intern_user_id',
        'group_name',
        'group_order',
        'item_order',
        'title',
        'responsible_role',
        'responsible_name',
        'due_at',
        'done',
        'completed_at',
        'completed_by',
        'notes',
    ];

    protected $casts = [
        'group_order' => 'integer',
        'item_order' => 'integer',
        'done' => 'boolean',
        'due_at' => 'datetime',
        'completed_at' => 'datetime',
    ];
}

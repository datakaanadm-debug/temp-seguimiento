<?php

declare(strict_types=1);

namespace App\Modules\Onboarding\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class OnboardingTemplateItem extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'onboarding_template_items';

    protected $fillable = [
        'tenant_id',
        'group_name',
        'group_order',
        'item_order',
        'title',
        'responsible_role',
        'default_days',
        'enabled',
    ];

    protected $casts = [
        'group_order' => 'integer',
        'item_order' => 'integer',
        'default_days' => 'integer',
        'enabled' => 'boolean',
    ];
}

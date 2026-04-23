<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class GrowthSkill extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'growth_skills';

    protected $fillable = [
        'tenant_id',
        'intern_user_id',
        'skill',
        'progress_percent',
        'category',
    ];

    protected $casts = [
        'progress_percent' => 'integer',
    ];
}

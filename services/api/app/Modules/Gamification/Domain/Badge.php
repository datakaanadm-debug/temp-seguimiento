<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Domain;

use App\Shared\Models\BaseModel;

class Badge extends BaseModel
{
    protected $table = 'badges';

    protected $fillable = [
        'tenant_id', 'slug', 'name', 'description', 'icon',
        'tier', 'points', 'kind', 'criteria', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'points' => 'integer',
        'criteria' => 'array',
    ];
}

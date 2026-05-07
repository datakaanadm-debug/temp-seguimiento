<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class UserPoints extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'user_points';

    protected $fillable = [
        'tenant_id', 'user_id', 'total_points',
        'streak_days', 'best_streak', 'last_activity_date', 'level', 'metadata',
    ];

    protected $casts = [
        'total_points' => 'integer',
        'streak_days' => 'integer',
        'best_streak' => 'integer',
        'last_activity_date' => 'date',
        'metadata' => 'array',
    ];

    protected $attributes = [
        'metadata' => '{}',
    ];
}

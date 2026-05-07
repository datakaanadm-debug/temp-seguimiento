<?php

declare(strict_types=1);

namespace App\Modules\Calendar\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class CalendarEvent extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'calendar_events';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'created_by',
        'starts_at',
        'duration_minutes',
        'title',
        'kind',
        'location',
        'description',
        'metadata',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'duration_minutes' => 'integer',
        'metadata' => 'array',
    ];
}

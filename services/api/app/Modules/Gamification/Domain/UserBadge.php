<?php

declare(strict_types=1);

namespace App\Modules\Gamification\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserBadge extends BaseModel
{
    use BelongsToTenant;

    public $timestamps = false;
    protected $table = 'user_badges';

    protected $fillable = [
        'tenant_id', 'user_id', 'badge_id',
        'progress_percent', 'earned_at', 'created_at',
    ];

    protected $casts = [
        'progress_percent' => 'integer',
        'earned_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function badge(): BelongsTo
    {
        return $this->belongsTo(Badge::class);
    }
}

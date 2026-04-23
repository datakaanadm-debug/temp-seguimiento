<?php

declare(strict_types=1);

namespace App\Modules\Okrs\Domain;

use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;

class OkrCheckIn extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'okr_check_ins';

    protected $fillable = [
        'tenant_id', 'key_result_id', 'author_id',
        'previous_progress', 'new_progress',
        'previous_confidence', 'new_confidence',
        'note',
    ];

    protected $casts = [
        'previous_progress' => 'integer',
        'new_progress' => 'integer',
        'previous_confidence' => 'integer',
        'new_confidence' => 'integer',
    ];
}

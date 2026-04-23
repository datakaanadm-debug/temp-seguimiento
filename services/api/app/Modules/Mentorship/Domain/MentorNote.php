<?php

declare(strict_types=1);

namespace App\Modules\Mentorship\Domain;

use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $tenant_id
 * @property ?string $session_id
 * @property string $intern_user_id
 * @property string $author_id
 * @property string $visibility
 * @property string $body
 * @property array $tags
 */
class MentorNote extends BaseModel
{
    use BelongsToTenant;

    protected $table = 'mentor_notes';

    protected $fillable = [
        'tenant_id',
        'session_id',
        'intern_user_id',
        'author_id',
        'visibility',
        'body',
        'tags',
    ];

    protected $casts = [
        'tags' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(MentorSession::class, 'session_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function intern(): BelongsTo
    {
        return $this->belongsTo(User::class, 'intern_user_id');
    }
}

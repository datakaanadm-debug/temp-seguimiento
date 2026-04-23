<?php

declare(strict_types=1);

namespace App\Modules\Identity\Domain;

use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Vinculación entre un User y una cuenta OAuth externa (Google, Microsoft, GitHub).
 *
 * @property string $id
 * @property string $user_id
 * @property string $provider
 * @property string $provider_user_id
 * @property ?string $email
 * @property ?array $raw_profile
 */
class OAuthProvider extends BaseModel
{
    protected $table = 'oauth_providers';

    protected $fillable = [
        'user_id',
        'provider',
        'provider_user_id',
        'email',
        'raw_profile',
    ];

    protected $casts = [
        'raw_profile' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}

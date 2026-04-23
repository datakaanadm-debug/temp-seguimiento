<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Domain;

use App\Modules\Identity\Domain\User;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Polimórfico: puede comentar sobre Task, Evaluation, etc.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $commentable_type
 * @property string $commentable_id
 * @property string $author_id
 * @property string $body
 * @property array $mentions     list<string> de user_id mencionados
 * @property ?string $parent_comment_id
 * @property ?\DateTimeInterface $edited_at
 */
class Comment extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'comments';

    protected $fillable = [
        'tenant_id',
        'commentable_type',
        'commentable_id',
        'author_id',
        'body',
        'mentions',
        'parent_comment_id',
        'edited_at',
    ];

    protected $casts = [
        'mentions' => 'array',
        'edited_at' => 'datetime',
    ];

    public function commentable(): MorphTo
    {
        return $this->morphTo();
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_comment_id');
    }
}

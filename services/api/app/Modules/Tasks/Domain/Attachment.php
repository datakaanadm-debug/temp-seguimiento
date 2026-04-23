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
 * @property string $id
 * @property string $tenant_id
 * @property string $attachable_type
 * @property string $attachable_id
 * @property string $uploaded_by
 * @property string $original_name
 * @property string $stored_key        path en R2
 * @property string $mime_type
 * @property int $size_bytes
 * @property ?string $checksum_sha256
 * @property array $metadata
 */
class Attachment extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'attachments';

    protected $fillable = [
        'tenant_id',
        'attachable_type',
        'attachable_id',
        'uploaded_by',
        'original_name',
        'stored_key',
        'mime_type',
        'size_bytes',
        'checksum_sha256',
        'metadata',
    ];

    protected $casts = [
        'size_bytes' => 'integer',
        'metadata' => 'array',
    ];

    public function attachable(): MorphTo
    {
        return $this->morphTo();
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }

    public function isImage(): bool
    {
        return str_starts_with($this->mime_type, 'image/');
    }
}

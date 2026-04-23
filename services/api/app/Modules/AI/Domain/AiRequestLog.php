<?php

declare(strict_types=1);

namespace App\Modules\AI\Domain;

use Illuminate\Database\Eloquent\Model;

/**
 * Append-only log. PK es bigIncrements (interno). No se expone en API pública.
 *
 * @property int $id
 * @property string $tenant_id
 * @property ?string $user_id
 * @property ?string $model
 * @property ?string $kind
 * @property ?int $prompt_tokens
 * @property ?int $completion_tokens
 * @property ?float $cost_usd
 * @property ?int $latency_ms
 * @property string $status          success|error|rate_limited|cached|timeout
 * @property bool $cache_hit
 * @property ?string $error_message
 */
class AiRequestLog extends Model
{
    public $timestamps = false;

    protected $table = 'ai_request_log';

    protected $fillable = [
        'tenant_id',
        'user_id',
        'model',
        'kind',
        'prompt_tokens',
        'completion_tokens',
        'cost_usd',
        'latency_ms',
        'status',
        'cache_hit',
        'error_message',
        'created_at',
    ];

    protected $casts = [
        'prompt_tokens' => 'integer',
        'completion_tokens' => 'integer',
        'cost_usd' => 'decimal:4',
        'latency_ms' => 'integer',
        'cache_hit' => 'boolean',
        'created_at' => 'datetime',
    ];
}

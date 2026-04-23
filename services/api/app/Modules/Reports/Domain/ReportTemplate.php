<?php

declare(strict_types=1);

namespace App\Modules\Reports\Domain;

use App\Modules\Reports\Domain\Enums\ReportKind;
use App\Shared\Concerns\BelongsToTenant;
use App\Shared\Models\BaseModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property string $id
 * @property string $tenant_id
 * @property ReportKind $kind
 * @property string $name
 * @property array $config            campos a incluir, filtros
 * @property string $layout           nombre de blade view
 * @property bool $is_system
 */
class ReportTemplate extends BaseModel
{
    use BelongsToTenant, SoftDeletes;

    protected $table = 'report_templates';

    protected $fillable = [
        'tenant_id',
        'kind',
        'name',
        'config',
        'layout',
        'is_system',
    ];

    protected $casts = [
        'kind' => ReportKind::class,
        'config' => 'array',
        'is_system' => 'boolean',
    ];

    public function runs(): HasMany
    {
        return $this->hasMany(ReportRun::class, 'template_id');
    }
}

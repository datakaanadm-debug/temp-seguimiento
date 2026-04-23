<?php

declare(strict_types=1);

namespace App\Shared\Models;

use App\Shared\Support\Uuid;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Clase base para todos los modelos de dominio.
 *
 * - PKs UUIDv7 (ordenables en tiempo, no adivinables).
 * - TimestampsTZ.
 * - Casts consistentes en dates/json.
 *
 * Los modelos que pertenecen a un tenant deben además usar `BelongsToTenant` trait.
 */
abstract class BaseModel extends Model
{
    use HasUuids;

    public $incrementing = false;
    protected $keyType = 'string';

    public function newUniqueId(): string
    {
        return Uuid::v7();
    }

    public function uniqueIds(): array
    {
        return [$this->getKeyName()];
    }
}

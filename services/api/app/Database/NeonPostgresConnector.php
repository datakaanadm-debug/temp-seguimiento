<?php

declare(strict_types=1);

namespace App\Database;

use Illuminate\Database\Connectors\PostgresConnector;

/**
 * Extensión del PostgresConnector estándar para inyectar `options=...` en
 * el DSN de libpq. Es necesario cuando se conecta a NeonDB con un PHP libpq
 * antiguo (< 13) que no envía SNI durante el TLS handshake.
 *
 * Sin SNI, NeonDB no sabe a qué endpoint del compute routear y exige el
 * param `?options=endpoint=<endpoint-id>`. Como la URL query de Laravel
 * parsea `?options=` como atributos PDO, hay que pasarlo via config key
 * dedicado (`pg_options`) que esta clase lee y appendea al DSN.
 *
 * Registrado en AppServiceProvider::register() como override del
 * connector `pgsql`.
 */
class NeonPostgresConnector extends PostgresConnector
{
    protected function getDsn(array $config)
    {
        $dsn = parent::getDsn($config);

        // `pg_options` es un string libpq-style ("k1=v1 k2=v2"). El más común
        // para NeonDB es "endpoint=ep-XXX". Solo se appendea si está set, así
        // que conexiones locales / sin Neon no se ven afectadas.
        if (!empty($config['pg_options']) && is_string($config['pg_options'])) {
            $dsn .= ';options=' . $config['pg_options'];
        }

        return $dsn;
    }
}

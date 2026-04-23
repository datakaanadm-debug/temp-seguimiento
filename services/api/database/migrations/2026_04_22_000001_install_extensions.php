<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        DB::unprepared('CREATE EXTENSION IF NOT EXISTS "citext"');
        DB::unprepared('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
        DB::unprepared('CREATE EXTENSION IF NOT EXISTS "btree_gin"');

        // pgvector puede no estar disponible en todas las imágenes Postgres.
        // En Railway 16+ sí; falla suave si no está.
        try {
            DB::unprepared('CREATE EXTENSION IF NOT EXISTS "vector"');
        } catch (\Throwable $e) {
            logger()->warning('pgvector extension not available; embeddings disabled', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    public function down(): void
    {
        // No dropeamos extensions: otras DBs/schemas pueden compartirlas.
    }
};

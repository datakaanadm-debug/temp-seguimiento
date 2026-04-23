<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vector dimension: 1536 por default (adecuado para Voyage AI,
        // OpenAI text-embedding-3-small). Ajustable por config si cambia el modelo.
        $dim = config('ai.embedding_dimensions', 1536);

        // Comprobar pgvector disponible
        $vectorAvailable = DB::select("SELECT 1 FROM pg_extension WHERE extname = 'vector'");
        if (empty($vectorAvailable)) {
            logger()->warning('pgvector not installed; skipping embeddings table creation');
            return;
        }

        DB::statement("
            CREATE TABLE embeddings (
                id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
                subject_type    VARCHAR(100) NOT NULL,
                subject_id      UUID NOT NULL,
                source_field    VARCHAR(50),
                content_hash    CHAR(64) NOT NULL,
                vector          VECTOR({$dim}) NOT NULL,
                model           VARCHAR(50) NOT NULL,
                created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (tenant_id, subject_type, subject_id, source_field)
            )
        ");

        DB::statement("
            CREATE INDEX idx_embeddings_subject
            ON embeddings (tenant_id, subject_type, subject_id)
        ");

        // Índice aproximado (IVFFlat) para nearest neighbor search con cosine distance
        // lists=100 es balance OK para <1M vectores; incrementar con escala
        DB::statement("
            CREATE INDEX idx_embeddings_vector_cosine
            ON embeddings USING ivfflat (vector vector_cosine_ops) WITH (lists = 100)
        ");

        // RLS
        DB::statement('ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE embeddings FORCE ROW LEVEL SECURITY');
        DB::statement("
            CREATE POLICY tenant_isolation ON embeddings
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('embeddings');
    }
};

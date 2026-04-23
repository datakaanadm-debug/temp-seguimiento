<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_insights', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('subject_type', 100);
            $table->uuid('subject_id');
            $table->string('kind', 40);
            $table->string('severity', 20);
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->jsonb('evidence')->nullable();
            $table->decimal('confidence', 4, 3)->nullable();
            $table->timestampTz('dismissed_at')->nullable();
            $table->foreignUuid('dismissed_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('acknowledged_at')->nullable();
            $table->foreignUuid('acknowledged_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('resolved_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE ai_insights
            ADD CONSTRAINT ai_insights_severity_check
            CHECK (severity IN ('info','warning','critical'))
        ");
        DB::statement("
            ALTER TABLE ai_insights
            ADD CONSTRAINT ai_insights_kind_check
            CHECK (kind IN (
                'risk_of_delay','pattern_blocked','low_activity','standout',
                'evaluation_risk','dropout_risk','mentor_match_suggestion'
            ))
        ");
        DB::statement("
            ALTER TABLE ai_insights
            ADD CONSTRAINT ai_insights_confidence_range
            CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
        ");

        DB::statement("
            CREATE INDEX idx_ai_insights_active_subject
            ON ai_insights (tenant_id, subject_type, subject_id)
            WHERE dismissed_at IS NULL AND resolved_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_ai_insights_severity_created
            ON ai_insights (tenant_id, severity, created_at DESC)
            WHERE dismissed_at IS NULL
        ");

        $this->enableRls('ai_insights');
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_insights');
    }

    private function enableRls(string $table): void
    {
        DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON {$table}
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }
};

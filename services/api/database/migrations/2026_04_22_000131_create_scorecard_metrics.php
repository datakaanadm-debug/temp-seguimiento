<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scorecard_metrics', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('scorecard_id')->constrained()->cascadeOnDelete();
            $table->string('key', 60);
            $table->string('label', 150);
            $table->string('type', 20);
            $table->string('source', 60)->nullable();
            $table->decimal('target_value', 10, 2)->nullable();
            $table->string('unit', 20)->nullable();
            $table->decimal('weight', 4, 2)->default(1.00);
            $table->jsonb('config')->default(DB::raw("'{}'::jsonb"));
            $table->integer('position')->default(0);
            $table->timestampsTz();

            $table->unique(['scorecard_id', 'key']);
        });

        DB::statement("
            ALTER TABLE scorecard_metrics
            ADD CONSTRAINT scorecard_metrics_type_check
            CHECK (type IN ('auto','manual','likert','rubric'))
        ");
        DB::statement("
            ALTER TABLE scorecard_metrics
            ADD CONSTRAINT scorecard_metrics_weight_positive
            CHECK (weight > 0)
        ");

        $this->enableRls('scorecard_metrics');
    }

    public function down(): void
    {
        Schema::dropIfExists('scorecard_metrics');
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

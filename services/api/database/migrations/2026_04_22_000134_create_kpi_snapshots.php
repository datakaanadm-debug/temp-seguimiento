<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kpi_snapshots', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('subject_type', 30);
            $table->uuid('subject_id');
            $table->string('metric_key', 60);
            $table->string('period', 20);
            $table->date('period_start');
            $table->date('period_end');
            $table->decimal('value', 12, 4);
            $table->integer('sample_size')->nullable();
            $table->timestampTz('computed_at')->useCurrent();

            $table->unique(
                ['tenant_id', 'subject_type', 'subject_id', 'metric_key', 'period', 'period_start'],
                'uniq_kpi_snapshots_subject_metric_period'
            );
        });

        DB::statement("
            ALTER TABLE kpi_snapshots
            ADD CONSTRAINT kpi_snapshots_subject_type_check
            CHECK (subject_type IN ('user','team','department','tenant'))
        ");
        DB::statement("
            ALTER TABLE kpi_snapshots
            ADD CONSTRAINT kpi_snapshots_period_check
            CHECK (period IN ('day','week','month','quarter','year'))
        ");
        DB::statement("
            ALTER TABLE kpi_snapshots
            ADD CONSTRAINT kpi_snapshots_period_range
            CHECK (period_end >= period_start)
        ");

        DB::statement("
            CREATE INDEX idx_kpi_snapshots_subject_metric
            ON kpi_snapshots (tenant_id, subject_type, subject_id, metric_key, period_start DESC)
        ");
        DB::statement("
            CREATE INDEX idx_kpi_snapshots_tenant_period
            ON kpi_snapshots (tenant_id, period, period_start)
        ");

        $this->enableRls('kpi_snapshots');
    }

    public function down(): void
    {
        Schema::dropIfExists('kpi_snapshots');
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

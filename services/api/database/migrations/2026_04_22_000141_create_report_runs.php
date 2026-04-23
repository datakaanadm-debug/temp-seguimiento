<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_runs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('template_id')
                ->references('id')->on('report_templates')->restrictOnDelete();
            $table->foreignUuid('requested_by')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->string('subject_type', 30)->nullable();
            $table->uuid('subject_id')->nullable();
            $table->date('period_start')->nullable();
            $table->date('period_end')->nullable();
            $table->jsonb('parameters')->nullable();
            $table->string('status', 20)->default('queued');
            $table->string('file_key', 500)->nullable();
            $table->bigInteger('file_size_bytes')->nullable();
            $table->text('error_message')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE report_runs
            ADD CONSTRAINT report_runs_status_check
            CHECK (status IN ('queued','running','completed','failed','expired'))
        ");
        DB::statement("
            ALTER TABLE report_runs
            ADD CONSTRAINT report_runs_subject_type_check
            CHECK (subject_type IS NULL OR subject_type IN ('user','team','department','tenant'))
        ");

        DB::statement("
            CREATE INDEX idx_report_runs_tenant_status_created
            ON report_runs (tenant_id, status, created_at DESC)
        ");
        DB::statement("
            CREATE INDEX idx_report_runs_requester
            ON report_runs (tenant_id, requested_by, created_at DESC)
        ");
        DB::statement("
            CREATE INDEX idx_report_runs_expiring
            ON report_runs (expires_at)
            WHERE file_key IS NOT NULL AND status = 'completed'
        ");

        $this->enableRls('report_runs');
    }

    public function down(): void
    {
        Schema::dropIfExists('report_runs');
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

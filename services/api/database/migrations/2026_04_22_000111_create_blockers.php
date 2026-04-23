<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blockers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('raised_by')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('related_task_id')->nullable()
                ->references('id')->on('tasks')->nullOnDelete();
            $table->foreignUuid('daily_report_id')->nullable()
                ->references('id')->on('daily_reports')->cascadeOnDelete();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('severity', 20)->default('medium');
            $table->string('status', 20)->default('open');
            $table->timestampTz('resolved_at')->nullable();
            $table->text('resolution')->nullable();
            $table->foreignUuid('resolved_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['tenant_id', 'raised_by']);
        });

        DB::statement("
            ALTER TABLE blockers
            ADD CONSTRAINT blockers_severity_check
            CHECK (severity IN ('low','medium','high','critical'))
        ");
        DB::statement("
            ALTER TABLE blockers
            ADD CONSTRAINT blockers_status_check
            CHECK (status IN ('open','acknowledged','resolved','dismissed'))
        ");

        DB::statement("
            CREATE INDEX idx_blockers_tenant_open
            ON blockers (tenant_id, severity, created_at DESC)
            WHERE status = 'open' AND deleted_at IS NULL
        ");

        $this->enableRls('blockers');
    }

    public function down(): void
    {
        Schema::dropIfExists('blockers');
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

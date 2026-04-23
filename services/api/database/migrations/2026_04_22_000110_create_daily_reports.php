<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_reports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->date('report_date');
            $table->string('status', 20)->default('submitted');
            $table->text('progress_summary');
            $table->text('blockers_text')->nullable();
            $table->text('plan_tomorrow')->nullable();
            $table->string('mood', 20)->nullable();
            $table->decimal('hours_worked', 4, 2)->nullable();
            $table->uuid('ai_summary_id')->nullable();  // FK añadida tras crear ai_summaries
            $table->timestampTz('submitted_at')->nullable();
            $table->foreignUuid('reviewed_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('reviewed_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'user_id', 'report_date']);
            $table->index(['tenant_id', 'report_date']);
        });

        DB::statement("
            ALTER TABLE daily_reports
            ADD CONSTRAINT daily_reports_status_check
            CHECK (status IN ('draft','submitted','reviewed'))
        ");
        DB::statement("
            ALTER TABLE daily_reports
            ADD CONSTRAINT daily_reports_mood_check
            CHECK (mood IS NULL OR mood IN ('great','good','ok','stressed','blocked'))
        ");
        DB::statement("
            ALTER TABLE daily_reports
            ADD CONSTRAINT daily_reports_hours_range
            CHECK (hours_worked IS NULL OR (hours_worked >= 0 AND hours_worked <= 24))
        ");

        DB::statement("
            CREATE INDEX idx_daily_reports_user_date_desc
            ON daily_reports (tenant_id, user_id, report_date DESC)
            WHERE deleted_at IS NULL
        ");

        $this->enableRls('daily_reports');
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_reports');
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

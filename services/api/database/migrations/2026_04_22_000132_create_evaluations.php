<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('scorecard_id')
                ->references('id')->on('scorecards')->restrictOnDelete();
            $table->foreignUuid('subject_user_id')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('evaluator_user_id')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->string('kind', 20);
            $table->date('scheduled_for')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('submitted_at')->nullable();
            $table->timestampTz('signed_at')->nullable();
            $table->timestampTz('acknowledged_at')->nullable();
            $table->string('status', 20)->default('SCHEDULED');
            $table->decimal('overall_score', 4, 2)->nullable();
            $table->text('narrative')->nullable();
            $table->text('ai_draft_narrative')->nullable();
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['tenant_id', 'subject_user_id', 'scheduled_for']);
            $table->index(['tenant_id', 'status', 'scheduled_for']);
            $table->index(['tenant_id', 'evaluator_user_id', 'status']);
        });

        DB::statement("
            ALTER TABLE evaluations
            ADD CONSTRAINT evaluations_kind_check
            CHECK (kind IN ('30d','60d','90d','adhoc','360','onboarding','offboarding'))
        ");
        DB::statement("
            ALTER TABLE evaluations
            ADD CONSTRAINT evaluations_status_check
            CHECK (status IN ('SCHEDULED','IN_PROGRESS','SUBMITTED','ACKNOWLEDGED','DISPUTED','RESOLVED','CANCELLED'))
        ");
        DB::statement("
            ALTER TABLE evaluations
            ADD CONSTRAINT evaluations_score_range
            CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10))
        ");
        DB::statement("
            ALTER TABLE evaluations
            ADD CONSTRAINT evaluations_subject_not_evaluator
            CHECK (evaluator_user_id IS NULL OR evaluator_user_id <> subject_user_id)
        ");

        $this->enableRls('evaluations');
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluations');
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

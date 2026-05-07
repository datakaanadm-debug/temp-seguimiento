<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('automation_rules', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->string('title', 200);
            $t->text('description')->nullable();
            // DSL alineado con doc sección 14
            $t->string('trigger_kind', 60);          // blocker.created | task.state_changed | schedule.cron | intern.added | evaluation.submitted | ...
            $t->jsonb('trigger_config')->default('{}');
            $t->jsonb('condition_config')->default('{}');
            $t->jsonb('actions_config')->default('[]'); // array de acciones
            $t->boolean('enabled')->default(true);
            $t->integer('runs_count')->default(0);
            $t->timestampTz('last_run_at')->nullable();
            $t->foreignUuid('created_by')->nullable()->references('id')->on('users')->nullOnDelete();
            $t->timestampsTz();

            $t->index(['tenant_id', 'enabled']);
        });

        DB::statement("ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE automation_rules FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON automation_rules
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");

        Schema::create('automation_runs', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('rule_id')->references('id')->on('automation_rules')->cascadeOnDelete();
            $t->string('status', 20);   // success | failure | skipped
            $t->jsonb('payload')->default('{}');
            $t->text('note')->nullable();
            $t->timestampTz('ran_at');
            $t->timestampsTz();

            $t->index(['tenant_id', 'rule_id', 'ran_at']);
        });

        DB::statement("ALTER TABLE automation_runs ADD CONSTRAINT automation_runs_status_chk CHECK (status IN ('success','failure','skipped'))");
        DB::statement("ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE automation_runs FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON automation_runs
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('automation_runs');
        Schema::dropIfExists('automation_rules');
    }
};

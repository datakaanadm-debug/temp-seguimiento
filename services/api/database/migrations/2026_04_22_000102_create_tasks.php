<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('list_id')->nullable()
                ->references('id')->on('task_lists')->nullOnDelete();
            // Self-FK a tasks se añade después del CREATE TABLE (Postgres no lo permite inline)
            $table->uuid('parent_task_id')->nullable();
            $table->string('title', 300);
            $table->text('description')->nullable();
            $table->string('state', 30)->default('TO_DO');
            $table->string('priority', 20)->default('normal');
            $table->foreignUuid('assignee_id')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('reviewer_id')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('due_at')->nullable();
            $table->integer('estimated_minutes')->nullable();
            $table->integer('actual_minutes')->default(0);
            $table->integer('position')->default(0);
            $table->text('blocked_reason')->nullable();
            $table->timestampTz('started_at')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('cancelled_at')->nullable();
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();
        });

        // Self-FK añadida ahora que la tabla existe
        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_parent_task_id_foreign
            FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
        ");

        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_state_check
            CHECK (state IN ('BACKLOG','TO_DO','IN_PROGRESS','IN_REVIEW','DONE','BLOCKED','CANCELLED'))
        ");
        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_priority_check
            CHECK (priority IN ('urgent','high','normal','low'))
        ");
        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_estimated_positive
            CHECK (estimated_minutes IS NULL OR estimated_minutes >= 0)
        ");
        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_actual_non_negative
            CHECK (actual_minutes >= 0)
        ");
        DB::statement("
            ALTER TABLE tasks
            ADD CONSTRAINT tasks_blocked_needs_reason
            CHECK (state <> 'BLOCKED' OR blocked_reason IS NOT NULL)
        ");

        // Índices críticos para performance
        DB::statement("
            CREATE INDEX idx_tasks_project_state_position
            ON tasks (tenant_id, project_id, state, position)
            WHERE deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_tasks_assignee_due
            ON tasks (tenant_id, assignee_id, due_at)
            WHERE state NOT IN ('DONE','CANCELLED') AND deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_tasks_due_pending
            ON tasks (tenant_id, due_at)
            WHERE state NOT IN ('DONE','CANCELLED') AND deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_tasks_parent
            ON tasks (tenant_id, parent_task_id)
            WHERE parent_task_id IS NOT NULL AND deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_tasks_search
            ON tasks USING GIN (to_tsvector('spanish', title || ' ' || coalesce(description, '')))
            WHERE deleted_at IS NULL
        ");

        $this->enableRls('tasks');
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
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

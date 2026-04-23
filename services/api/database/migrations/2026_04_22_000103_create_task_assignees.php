<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_assignees', function (Blueprint $table) {
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('role', 20)->default('assignee');
            $table->timestampTz('assigned_at')->useCurrent();
            $table->foreignUuid('assigned_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();

            $table->primary(['task_id', 'user_id', 'role']);
            $table->index(['tenant_id', 'user_id', 'role']);
        });

        DB::statement("
            ALTER TABLE task_assignees
            ADD CONSTRAINT task_assignees_role_check
            CHECK (role IN ('assignee','reviewer','watcher'))
        ");

        $this->enableRls('task_assignees');
    }

    public function down(): void
    {
        Schema::dropIfExists('task_assignees');
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

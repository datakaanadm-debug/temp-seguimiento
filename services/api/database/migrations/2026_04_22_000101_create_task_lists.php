<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('project_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->integer('position')->default(0);
            $table->string('color', 7)->nullable();
            $table->integer('wip_limit')->nullable();
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE task_lists
            ADD CONSTRAINT task_lists_wip_positive
            CHECK (wip_limit IS NULL OR wip_limit > 0)
        ");

        DB::statement("
            CREATE INDEX idx_task_lists_project_position
            ON task_lists (tenant_id, project_id, position)
            WHERE deleted_at IS NULL
        ");

        $this->enableRls('task_lists');
    }

    public function down(): void
    {
        Schema::dropIfExists('task_lists');
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

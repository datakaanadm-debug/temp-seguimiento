<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_tag', function (Blueprint $table) {
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('tag_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->timestampTz('created_at')->useCurrent();

            $table->primary(['task_id', 'tag_id']);
            $table->index(['tenant_id', 'tag_id']);
        });

        $this->enableRls('task_tag');
    }

    public function down(): void
    {
        Schema::dropIfExists('task_tag');
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

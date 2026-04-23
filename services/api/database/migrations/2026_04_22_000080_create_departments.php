<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('name', 150);
            $table->string('slug', 60);
            $table->integer('position')->default(0);
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'position']);
        });

        $this->enableRls('departments');
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
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

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->string('name', 200);
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active');
            $table->string('color', 7)->nullable();
            $table->text('cover_url')->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('archived_at')->nullable();
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'team_id', 'status']);
            $table->index(['tenant_id', 'status']);
        });

        DB::statement("
            ALTER TABLE projects
            ADD CONSTRAINT projects_status_check
            CHECK (status IN ('active','paused','archived','completed'))
        ");
        DB::statement("
            ALTER TABLE projects
            ADD CONSTRAINT projects_dates_check
            CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
        ");

        $this->enableRls('projects');
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
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

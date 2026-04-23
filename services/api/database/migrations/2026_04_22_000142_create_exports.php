<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exports', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('requested_by')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->string('resource', 50);
            $table->string('format', 10);
            $table->jsonb('filters')->nullable();
            $table->string('status', 20)->default('queued');
            $table->string('file_key', 500)->nullable();
            $table->integer('row_count')->nullable();
            $table->timestampTz('completed_at')->nullable();
            $table->timestampTz('expires_at')->nullable();
            $table->timestampsTz();

            $table->index(['tenant_id', 'requested_by', 'created_at']);
        });

        DB::statement("
            ALTER TABLE exports
            ADD CONSTRAINT exports_format_check
            CHECK (format IN ('csv','json','xlsx'))
        ");
        DB::statement("
            ALTER TABLE exports
            ADD CONSTRAINT exports_status_check
            CHECK (status IN ('queued','running','completed','failed','expired'))
        ");
        DB::statement("
            ALTER TABLE exports
            ADD CONSTRAINT exports_resource_check
            CHECK (resource IN ('tasks','users','evaluations','time_entries','daily_reports'))
        ");

        $this->enableRls('exports');
    }

    public function down(): void
    {
        Schema::dropIfExists('exports');
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

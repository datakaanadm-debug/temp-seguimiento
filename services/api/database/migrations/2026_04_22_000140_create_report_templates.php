<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('kind', 30);
            $table->string('name', 150);
            $table->jsonb('config');
            $table->string('layout', 50)->default('default');
            $table->boolean('is_system')->default(false);
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['tenant_id', 'kind']);
        });

        DB::statement("
            ALTER TABLE report_templates
            ADD CONSTRAINT report_templates_kind_check
            CHECK (kind IN ('university','executive','team','intern','custom'))
        ");

        $this->enableRls('report_templates');
    }

    public function down(): void
    {
        Schema::dropIfExists('report_templates');
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

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_summaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('subject_type', 100);
            $table->uuid('subject_id');
            $table->string('kind', 30);
            $table->string('model', 50);
            $table->integer('prompt_tokens')->nullable();
            $table->integer('completion_tokens')->nullable();
            $table->decimal('cost_usd', 8, 4)->nullable();
            $table->text('content');
            $table->timestampTz('approved_at')->nullable();
            $table->foreignUuid('approved_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("
            ALTER TABLE ai_summaries
            ADD CONSTRAINT ai_summaries_kind_check
            CHECK (kind IN ('daily','weekly','task','evaluation','session','project'))
        ");

        DB::statement("
            CREATE INDEX idx_ai_summaries_subject
            ON ai_summaries (tenant_id, subject_type, subject_id, kind, created_at DESC)
        ");
        DB::statement("
            CREATE INDEX idx_ai_summaries_tenant_created
            ON ai_summaries (tenant_id, created_at DESC)
        ");

        // Ahora podemos añadir la FK pendiente en daily_reports
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->foreign('ai_summary_id')->references('id')->on('ai_summaries')->nullOnDelete();
        });

        $this->enableRls('ai_summaries');
    }

    public function down(): void
    {
        Schema::table('daily_reports', function (Blueprint $table) {
            $table->dropForeign(['ai_summary_id']);
        });
        Schema::dropIfExists('ai_summaries');
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

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evaluation_responses', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('evaluation_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('metric_id')
                ->references('id')->on('scorecard_metrics')->restrictOnDelete();
            $table->decimal('value_numeric', 10, 2)->nullable();
            $table->text('value_text')->nullable();
            $table->jsonb('value_json')->nullable();
            $table->decimal('auto_value', 10, 2)->nullable();
            $table->timestampsTz();

            $table->unique(['evaluation_id', 'metric_id']);
        });

        $this->enableRls('evaluation_responses');
    }

    public function down(): void
    {
        Schema::dropIfExists('evaluation_responses');
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

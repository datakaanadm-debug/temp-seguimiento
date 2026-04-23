<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ai_request_log', function (Blueprint $table) {
            $table->bigIncrements('id');  // alto volumen, no expuesto por API
            $table->uuid('tenant_id');
            $table->uuid('user_id')->nullable();
            $table->string('model', 50)->nullable();
            $table->string('kind', 30)->nullable();
            $table->integer('prompt_tokens')->nullable();
            $table->integer('completion_tokens')->nullable();
            $table->decimal('cost_usd', 8, 4)->nullable();
            $table->integer('latency_ms')->nullable();
            $table->string('status', 20);
            $table->boolean('cache_hit')->default(false);
            $table->text('error_message')->nullable();
            $table->timestampTz('created_at')->useCurrent();
        });

        DB::statement("
            ALTER TABLE ai_request_log
            ADD CONSTRAINT ai_request_log_status_check
            CHECK (status IN ('success','error','rate_limited','cached','timeout'))
        ");

        // No FKs para no frenar inserts ni complicar drop/retention
        DB::statement("
            CREATE INDEX idx_ai_request_log_tenant_created
            ON ai_request_log (tenant_id, created_at DESC)
        ");
        DB::statement("
            CREATE INDEX idx_ai_request_log_status_created
            ON ai_request_log (status, created_at DESC)
        ");

        // RLS aplicada
        DB::statement('ALTER TABLE ai_request_log ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE ai_request_log FORCE ROW LEVEL SECURITY');
        DB::statement("
            CREATE POLICY tenant_isolation ON ai_request_log
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('ai_request_log');
    }
};

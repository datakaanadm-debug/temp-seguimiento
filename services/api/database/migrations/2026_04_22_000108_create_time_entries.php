<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('time_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('task_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestampTz('started_at');
            $table->timestampTz('ended_at')->nullable();
            $table->integer('duration_minutes')->nullable();
            $table->text('note')->nullable();
            $table->string('source', 20)->default('timer');
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE time_entries
            ADD CONSTRAINT time_entries_ended_after_started
            CHECK (ended_at IS NULL OR ended_at >= started_at)
        ");
        DB::statement("
            ALTER TABLE time_entries
            ADD CONSTRAINT time_entries_source_check
            CHECK (source IN ('timer','manual','auto'))
        ");
        DB::statement("
            ALTER TABLE time_entries
            ADD CONSTRAINT time_entries_duration_positive
            CHECK (duration_minutes IS NULL OR duration_minutes >= 0)
        ");

        DB::statement("
            CREATE INDEX idx_time_entries_user_started
            ON time_entries (tenant_id, user_id, started_at DESC)
        ");
        DB::statement("
            CREATE INDEX idx_time_entries_task
            ON time_entries (tenant_id, task_id)
        ");
        // Prevenir entradas solapadas del mismo user (solo sobre entries cerradas para no bloquear timer abierto)
        DB::statement("
            CREATE INDEX idx_time_entries_user_open
            ON time_entries (user_id)
            WHERE ended_at IS NULL
        ");

        $this->enableRls('time_entries');
    }

    public function down(): void
    {
        Schema::dropIfExists('time_entries');
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

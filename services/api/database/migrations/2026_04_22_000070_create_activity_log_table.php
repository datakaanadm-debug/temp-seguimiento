<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_log', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->nullable()
                ->references('id')->on('tenants')->restrictOnDelete();
            $table->string('log_name', 50)->nullable();
            $table->text('description')->nullable();
            $table->string('subject_type', 100)->nullable();
            $table->uuid('subject_id')->nullable();
            $table->string('causer_type', 100)->nullable();
            $table->uuid('causer_id')->nullable();
            $table->string('event', 50)->nullable();
            $table->jsonb('properties')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('request_id', 36)->nullable();
            $table->timestampTz('created_at')->useCurrent();

            $table->index(['tenant_id', 'created_at'], 'idx_activity_tenant_created');
            $table->index(['subject_type', 'subject_id'], 'idx_activity_subject');
            $table->index(['causer_type', 'causer_id'], 'idx_activity_causer');
            $table->index('log_name');
        });

        // Inmutabilidad: evitar UPDATE / DELETE incluso para el owner de la tabla
        // Se aplica tras crear el rol de la app; por ahora marcamos con comment
        DB::statement("COMMENT ON TABLE activity_log IS 'IMMUTABLE: revoke UPDATE/DELETE from app role'");

        $this->enableRls('activity_log');
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_log');
    }

    private function enableRls(string $table): void
    {
        DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON {$table}
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid OR tenant_id IS NULL)
        ");
    }
};

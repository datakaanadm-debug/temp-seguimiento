<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 150);
            $table->foreignUuid('tenant_id')->nullable()
                ->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('notifiable_type', 100);
            $table->uuid('notifiable_id');
            $table->jsonb('data');
            $table->timestampTz('read_at')->nullable();
            $table->timestampsTz();

            $table->index(['notifiable_type', 'notifiable_id', 'read_at', 'created_at']);
        });

        DB::statement("
            CREATE INDEX idx_notifications_tenant_created
            ON notifications (tenant_id, created_at DESC)
            WHERE tenant_id IS NOT NULL
        ");

        // RLS se adapta para permitir notifications sin tenant (sistema).
        DB::statement('ALTER TABLE notifications ENABLE ROW LEVEL SECURITY');
        DB::statement('ALTER TABLE notifications FORCE ROW LEVEL SECURITY');
        DB::statement("
            CREATE POLICY tenant_isolation ON notifications
            USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};

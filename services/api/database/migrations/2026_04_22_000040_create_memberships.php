<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 30);
            $table->string('status', 20)->default('active');
            $table->foreignUuid('invited_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('joined_at')->nullable();
            $table->timestampTz('last_active_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'user_id']);
            $table->index(['user_id']);
            $table->index(['tenant_id', 'status']);
        });

        // Constraints
        DB::statement("
            ALTER TABLE memberships
            ADD CONSTRAINT memberships_role_check
            CHECK (role IN ('tenant_admin','hr','team_lead','mentor','intern','supervisor','viewer'))
        ");
        DB::statement("
            ALTER TABLE memberships
            ADD CONSTRAINT memberships_status_check
            CHECK (status IN ('active','suspended','removed'))
        ");

        // Partial index para filtrar activos
        DB::statement("
            CREATE INDEX idx_memberships_tenant_role_active
            ON memberships (tenant_id, role)
            WHERE deleted_at IS NULL AND status = 'active'
        ");

        $this->enableRls('memberships');
    }

    public function down(): void
    {
        Schema::dropIfExists('memberships');
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

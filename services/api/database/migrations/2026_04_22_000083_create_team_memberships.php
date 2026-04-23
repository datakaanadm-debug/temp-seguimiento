<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('team_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 30);
            $table->timestampTz('joined_at')->useCurrent();
            $table->timestampTz('left_at')->nullable();
            $table->timestampsTz();

            $table->index(['team_id', 'role']);
        });

        DB::statement("
            ALTER TABLE team_memberships
            ADD CONSTRAINT team_memberships_role_check
            CHECK (role IN ('lead','mentor','intern','viewer'))
        ");

        // Unique partial: 1 user en 1 team activo a la vez por rol
        DB::statement("
            CREATE UNIQUE INDEX idx_team_memberships_active
            ON team_memberships (team_id, user_id, role)
            WHERE left_at IS NULL
        ");

        DB::statement("
            CREATE INDEX idx_team_memberships_tenant_user_active
            ON team_memberships (tenant_id, user_id)
            WHERE left_at IS NULL
        ");

        $this->enableRls('team_memberships');
    }

    public function down(): void
    {
        Schema::dropIfExists('team_memberships');
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

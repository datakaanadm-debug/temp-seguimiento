<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invitations', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('email', 255);
            $table->string('token_hash', 64)->unique();
            $table->string('role', 30);
            $table->foreignUuid('team_id')->nullable();
            $table->foreignUuid('mentor_id')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampTz('expires_at');
            $table->timestampTz('accepted_at')->nullable();
            $table->foreignUuid('accepted_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('invited_by')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampsTz();

            // FK a teams se añade después (teams aún no existe); se añade con adjust migration.
            $table->index(['tenant_id', 'email']);
        });

        DB::statement('ALTER TABLE invitations ALTER COLUMN email TYPE CITEXT');
        DB::statement("
            ALTER TABLE invitations
            ADD CONSTRAINT invitations_role_check
            CHECK (role IN ('tenant_admin','hr','team_lead','mentor','intern','supervisor','viewer'))
        ");

        // Partial indexes
        DB::statement("
            CREATE UNIQUE INDEX idx_invitations_email_pending
            ON invitations (tenant_id, email)
            WHERE accepted_at IS NULL AND revoked_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_invitations_expiring
            ON invitations (expires_at)
            WHERE accepted_at IS NULL AND revoked_at IS NULL
        ");

        $this->enableRls('invitations');
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
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

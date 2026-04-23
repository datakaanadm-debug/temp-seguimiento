<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teams', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('area_id')->constrained()->cascadeOnDelete();
            $table->string('name', 150);
            $table->string('slug', 60);
            $table->foreignUuid('lead_user_id')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->string('color', 7)->default('#0891B2');
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'area_id', 'slug']);
            $table->index(['tenant_id', 'lead_user_id']);
        });

        // Color HEX válido
        DB::statement("
            ALTER TABLE teams
            ADD CONSTRAINT teams_color_check
            CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
        ");

        // Ahora podemos añadir la FK pendiente de invitations → teams
        Schema::table('invitations', function (Blueprint $table) {
            $table->foreign('team_id')->references('id')->on('teams')->nullOnDelete();
        });

        $this->enableRls('teams');
    }

    public function down(): void
    {
        Schema::table('invitations', function (Blueprint $table) {
            $table->dropForeign(['team_id']);
        });
        Schema::dropIfExists('teams');
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

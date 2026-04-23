<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mentor_assignments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('mentor_user_id')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->foreignUuid('intern_user_id')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->timestampTz('started_at')->useCurrent();
            $table->timestampTz('ended_at')->nullable();
            $table->string('status', 20)->default('active');
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index(['tenant_id', 'mentor_user_id', 'status']);
            $table->index(['tenant_id', 'intern_user_id', 'status']);
        });

        DB::statement("
            ALTER TABLE mentor_assignments
            ADD CONSTRAINT mentor_assignments_status_check
            CHECK (status IN ('active','ended','paused'))
        ");
        DB::statement("
            ALTER TABLE mentor_assignments
            ADD CONSTRAINT mentor_assignments_different_users
            CHECK (mentor_user_id <> intern_user_id)
        ");

        // Un practicante solo puede tener 1 mentor activo
        DB::statement("
            CREATE UNIQUE INDEX idx_mentor_assignments_intern_active
            ON mentor_assignments (tenant_id, intern_user_id)
            WHERE status = 'active'
        ");

        $this->enableRls('mentor_assignments');
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_assignments');
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

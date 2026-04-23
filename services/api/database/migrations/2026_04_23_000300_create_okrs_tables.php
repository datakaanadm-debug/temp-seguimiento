<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('objectives', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->string('level', 20);  // company|team|individual
            $t->string('label', 400);
            $t->string('quarter', 10);  // Q2 2026
            $t->string('owner_type', 20); // tenant|team|user
            $t->uuid('owner_id');         // tenant.id / team.id / user.id
            $t->string('owner_name', 200)->nullable();
            $t->uuid('parent_objective_id')->nullable();
            $t->timestampTz('starts_at')->nullable();
            $t->timestampTz('ends_at')->nullable();
            $t->string('status', 20)->default('active'); // active|completed|cancelled
            $t->timestampsTz();

            $t->index(['tenant_id', 'level', 'quarter']);
            $t->index(['tenant_id', 'owner_type', 'owner_id']);
        });

        DB::statement("
            ALTER TABLE objectives
            ADD CONSTRAINT objectives_level_check
            CHECK (level IN ('company','team','individual'))
        ");
        DB::statement("
            ALTER TABLE objectives
            ADD CONSTRAINT objectives_owner_type_check
            CHECK (owner_type IN ('tenant','team','user'))
        ");
        DB::statement("
            ALTER TABLE objectives
            ADD CONSTRAINT objectives_parent_fk
            FOREIGN KEY (parent_objective_id) REFERENCES objectives(id) ON DELETE SET NULL
        ");

        Schema::create('key_results', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('objective_id')->constrained('objectives')->cascadeOnDelete();
            $t->smallInteger('position')->default(0);
            $t->string('text', 500);
            $t->smallInteger('progress_percent')->default(0);
            $t->smallInteger('confidence')->default(5); // 0-10
            $t->string('unit', 20)->default('percent'); // percent|count|currency
            $t->decimal('target_value', 12, 2)->nullable();
            $t->decimal('current_value', 12, 2)->nullable();
            $t->timestampsTz();

            $t->index(['tenant_id', 'objective_id']);
        });

        Schema::create('okr_check_ins', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('key_result_id')->constrained('key_results')->cascadeOnDelete();
            $t->foreignUuid('author_id')->references('id')->on('users')->cascadeOnDelete();
            $t->smallInteger('previous_progress')->nullable();
            $t->smallInteger('new_progress');
            $t->smallInteger('previous_confidence')->nullable();
            $t->smallInteger('new_confidence')->nullable();
            $t->text('note')->nullable();
            $t->timestampsTz();

            $t->index(['tenant_id', 'key_result_id', 'created_at']);
        });

        foreach (['objectives', 'key_results', 'okr_check_ins'] as $tbl) {
            DB::statement("ALTER TABLE {$tbl} ENABLE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$tbl} FORCE ROW LEVEL SECURITY");
            DB::statement("
                CREATE POLICY tenant_isolation ON {$tbl}
                USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('okr_check_ins');
        Schema::dropIfExists('key_results');
        Schema::dropIfExists('objectives');
    }
};

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
        // Mentor assignments: relaciona practicante con mentor (ya existe mentor_assignments
        // en People; aquí enriquecemos con growth data sólo si no existe).

        Schema::create('mentor_sessions', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('mentor_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreignUuid('intern_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->timestampTz('scheduled_at');
            $t->integer('duration_minutes')->default(30);
            $t->string('topic', 300);
            $t->jsonb('agenda')->default(DB::raw("'[]'::jsonb"));
            $t->string('location', 200)->nullable();
            $t->string('status', 20)->default('scheduled'); // scheduled|in_progress|completed|cancelled|no_show
            $t->timestampTz('started_at')->nullable();
            $t->timestampTz('completed_at')->nullable();
            $t->jsonb('tags')->default(DB::raw("'[]'::jsonb"));
            $t->timestampsTz();

            $t->index(['tenant_id', 'mentor_user_id', 'scheduled_at']);
            $t->index(['tenant_id', 'intern_user_id', 'scheduled_at']);
        });

        DB::statement("
            ALTER TABLE mentor_sessions
            ADD CONSTRAINT mentor_sessions_status_check
            CHECK (status IN ('scheduled','in_progress','completed','cancelled','no_show'))
        ");

        Schema::create('mentor_notes', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('session_id')->nullable()
                ->references('id')->on('mentor_sessions')->cascadeOnDelete();
            $t->foreignUuid('intern_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreignUuid('author_id')->references('id')->on('users')->cascadeOnDelete();
            $t->string('visibility', 20)->default('private'); // private|shared
            $t->text('body');
            $t->jsonb('tags')->default(DB::raw("'[]'::jsonb"));
            $t->timestampsTz();

            $t->index(['tenant_id', 'intern_user_id', 'created_at']);
            $t->index(['tenant_id', 'author_id', 'created_at']);
        });

        DB::statement("
            ALTER TABLE mentor_notes
            ADD CONSTRAINT mentor_notes_visibility_check
            CHECK (visibility IN ('private','shared'))
        ");

        Schema::create('growth_skills', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('intern_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->string('skill', 120);
            $t->smallInteger('progress_percent')->default(0);
            $t->string('category', 60)->nullable(); // fundamentos|systems|facilitacion|comunicacion
            $t->timestampsTz();

            $t->unique(['tenant_id', 'intern_user_id', 'skill']);
            $t->index(['tenant_id', 'intern_user_id']);
        });

        Schema::create('growth_goals', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('intern_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->string('text', 400);
            $t->string('quarter', 10)->nullable(); // Q1 2026, Q2 2026
            $t->boolean('done')->default(false);
            $t->timestampTz('due_at')->nullable();
            $t->timestampTz('completed_at')->nullable();
            $t->timestampsTz();

            $t->index(['tenant_id', 'intern_user_id', 'quarter']);
        });

        foreach (['mentor_sessions', 'mentor_notes', 'growth_skills', 'growth_goals'] as $tbl) {
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
        Schema::dropIfExists('growth_goals');
        Schema::dropIfExists('growth_skills');
        Schema::dropIfExists('mentor_notes');
        Schema::dropIfExists('mentor_sessions');
    }
};

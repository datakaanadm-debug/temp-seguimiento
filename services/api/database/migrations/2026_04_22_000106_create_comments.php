<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('commentable_type', 100);
            $table->uuid('commentable_id');
            $table->foreignUuid('author_id')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->text('body');
            $table->jsonb('mentions')->default(DB::raw("'[]'::jsonb"));
            // Self-FK se añade después (Postgres no permite inline en CREATE TABLE para self-reference UUID)
            $table->uuid('parent_comment_id')->nullable();
            $table->timestampTz('edited_at')->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE comments
            ADD CONSTRAINT comments_parent_comment_id_foreign
            FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE
        ");

        DB::statement("
            CREATE INDEX idx_comments_on_subject
            ON comments (tenant_id, commentable_type, commentable_id, created_at DESC)
            WHERE deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_comments_author
            ON comments (tenant_id, author_id, created_at DESC)
            WHERE deleted_at IS NULL
        ");

        $this->enableRls('comments');
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
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

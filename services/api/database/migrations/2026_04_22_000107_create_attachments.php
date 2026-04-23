<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('attachable_type', 100);
            $table->uuid('attachable_id');
            $table->foreignUuid('uploaded_by')
                ->references('id')->on('users')->cascadeOnDelete();
            $table->string('original_name', 255);
            $table->string('stored_key', 500);
            $table->string('mime_type', 100);
            $table->bigInteger('size_bytes');
            $table->char('checksum_sha256', 64)->nullable();
            $table->jsonb('metadata')->default(DB::raw("'{}'::jsonb"));
            $table->softDeletesTz();
            $table->timestampsTz();
        });

        DB::statement("
            ALTER TABLE attachments
            ADD CONSTRAINT attachments_size_positive
            CHECK (size_bytes > 0)
        ");

        DB::statement("
            CREATE INDEX idx_attachments_on_subject
            ON attachments (tenant_id, attachable_type, attachable_id)
            WHERE deleted_at IS NULL
        ");
        DB::statement("
            CREATE INDEX idx_attachments_uploader
            ON attachments (tenant_id, uploaded_by, created_at DESC)
            WHERE deleted_at IS NULL
        ");

        $this->enableRls('attachments');
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
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

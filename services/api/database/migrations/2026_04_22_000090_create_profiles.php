<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->text('bio')->nullable();
            // Campos cifrados app-level (TEXT porque ciphertext Base64 puede exceder varchar corto)
            $table->text('phone')->nullable();
            $table->text('national_id')->nullable();
            $table->date('birth_date')->nullable();
            $table->string('position_title', 150)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->string('kind', 20);
            $table->jsonb('skills')->default(DB::raw("'[]'::jsonb"));
            $table->jsonb('social_links')->default(DB::raw("'{}'::jsonb"));
            $table->jsonb('emergency_contact')->default(DB::raw("'{}'::jsonb"));
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'user_id']);
            $table->index(['tenant_id', 'kind']);
            $table->index(['tenant_id', 'position_title']);
        });

        DB::statement("
            ALTER TABLE profiles
            ADD CONSTRAINT profiles_kind_check
            CHECK (kind IN ('intern','mentor','staff','hr','admin'))
        ");
        DB::statement("
            ALTER TABLE profiles
            ADD CONSTRAINT profiles_end_after_start
            CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
        ");

        $this->enableRls('profiles');
    }

    public function down(): void
    {
        Schema::dropIfExists('profiles');
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

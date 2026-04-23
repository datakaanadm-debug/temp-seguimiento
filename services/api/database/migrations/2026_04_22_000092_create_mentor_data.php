<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mentor_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('profile_id')->constrained()->cascadeOnDelete();
            $table->jsonb('expertise')->default(DB::raw("'[]'::jsonb"));
            $table->unsignedSmallInteger('max_mentees')->default(5);
            $table->jsonb('availability')->default(DB::raw("'{}'::jsonb"));
            $table->timestampTz('certified_at')->nullable();
            $table->timestampsTz();

            $table->unique('profile_id');
        });

        $this->enableRls('mentor_data');
    }

    public function down(): void
    {
        Schema::dropIfExists('mentor_data');
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

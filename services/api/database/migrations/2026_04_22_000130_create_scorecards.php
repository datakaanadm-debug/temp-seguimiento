<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scorecards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('applicable_to', 20)->default('intern');
            $table->boolean('is_active')->default(true);
            $table->foreignUuid('created_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->foreignUuid('updated_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index(['tenant_id', 'is_active', 'applicable_to']);
        });

        DB::statement("
            ALTER TABLE scorecards
            ADD CONSTRAINT scorecards_applicable_check
            CHECK (applicable_to IN ('intern','mentor','staff'))
        ");

        $this->enableRls('scorecards');
    }

    public function down(): void
    {
        Schema::dropIfExists('scorecards');
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

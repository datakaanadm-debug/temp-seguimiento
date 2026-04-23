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
        Schema::create('onboarding_items', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('intern_user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->string('group_name', 100);   // Ingreso y documentación, Accesos y herramientas, etc.
            $t->smallInteger('group_order')->default(0);
            $t->smallInteger('item_order')->default(0);
            $t->string('title', 300);
            $t->string('responsible_role', 60)->nullable(); // RRHH|TI|Líder|Mentor|Practicante
            $t->string('responsible_name', 150)->nullable();
            $t->timestampTz('due_at')->nullable();
            $t->boolean('done')->default(false);
            $t->timestampTz('completed_at')->nullable();
            $t->foreignUuid('completed_by')->nullable()
                ->references('id')->on('users')->nullOnDelete();
            $t->text('notes')->nullable();
            $t->timestampsTz();

            $t->index(['tenant_id', 'intern_user_id', 'group_order', 'item_order']);
        });

        DB::statement("ALTER TABLE onboarding_items ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE onboarding_items FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON onboarding_items
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_items');
    }
};

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
        Schema::create('onboarding_template_items', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->cascadeOnDelete();
            $t->string('group_name', 100);
            $t->smallInteger('group_order')->default(0);
            $t->smallInteger('item_order')->default(0);
            $t->string('title', 300);
            $t->string('responsible_role', 60)->nullable();
            $t->smallInteger('default_days')->default(7); // días desde start_date para due_at
            $t->boolean('enabled')->default(true);
            $t->timestampsTz();

            $t->index(['tenant_id', 'group_order', 'item_order']);
        });

        DB::statement("ALTER TABLE onboarding_template_items ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE onboarding_template_items FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON onboarding_template_items
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('onboarding_template_items');
    }
};

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
        Schema::create('badges', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->nullable()->references('id')->on('tenants')->cascadeOnDelete();
            $t->string('slug', 80);
            $t->string('name', 150);
            $t->string('description', 500);
            $t->string('icon', 40);  // Icon name
            $t->string('tier', 20)->default('bronze'); // bronze|silver|gold|platinum
            $t->smallInteger('points')->default(50);
            $t->string('kind', 40)->default('manual'); // manual|streak|milestone|achievement
            $t->jsonb('criteria')->default(DB::raw("'{}'::jsonb"));
            $t->boolean('is_active')->default(true);
            $t->timestampsTz();

            $t->unique(['tenant_id', 'slug']);
        });

        DB::statement("
            ALTER TABLE badges
            ADD CONSTRAINT badges_tier_check
            CHECK (tier IN ('bronze','silver','gold','platinum'))
        ");

        Schema::create('user_badges', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreignUuid('badge_id')->references('id')->on('badges')->cascadeOnDelete();
            $t->smallInteger('progress_percent')->default(100); // 100 cuando earned
            $t->timestampTz('earned_at')->nullable();
            $t->timestampTz('created_at')->useCurrent();

            $t->unique(['tenant_id', 'user_id', 'badge_id']);
            $t->index(['tenant_id', 'user_id']);
        });

        Schema::create('user_points', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->integer('total_points')->default(0);
            $t->smallInteger('streak_days')->default(0);
            $t->smallInteger('best_streak')->default(0);
            $t->date('last_activity_date')->nullable();
            $t->string('level', 20)->default('Junior'); // Junior|Mid|Senior|Lead
            $t->timestampsTz();

            $t->unique(['tenant_id', 'user_id']);
        });

        foreach (['badges', 'user_badges', 'user_points'] as $tbl) {
            DB::statement("ALTER TABLE {$tbl} ENABLE ROW LEVEL SECURITY");
            DB::statement("ALTER TABLE {$tbl} FORCE ROW LEVEL SECURITY");
            DB::statement("
                CREATE POLICY tenant_isolation ON {$tbl}
                USING (tenant_id IS NULL OR tenant_id = current_setting('app.tenant_id', true)::uuid)
            ");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_points');
        Schema::dropIfExists('user_badges');
        Schema::dropIfExists('badges');
    }
};

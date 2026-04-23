<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('slug', 50)->unique();
            $table->string('name', 150);
            $table->string('plan', 30)->default('starter');
            $table->string('status', 20)->default('trialing');
            $table->jsonb('settings')->default(DB::raw("'{}'::jsonb"));
            $table->jsonb('theme')->default(DB::raw("'{}'::jsonb"));
            $table->string('data_residency', 10)->default('latam');
            $table->string('stripe_customer_id', 50)->nullable()->unique();
            $table->timestampTz('trial_ends_at')->nullable();
            $table->timestampTz('suspended_at')->nullable();
            $table->timestampsTz();

            $table->index('status');
            $table->index('plan');
        });

        DB::statement("
            ALTER TABLE tenants
            ADD CONSTRAINT tenants_plan_check
            CHECK (plan IN ('starter','growth','business','enterprise'))
        ");
        DB::statement("
            ALTER TABLE tenants
            ADD CONSTRAINT tenants_status_check
            CHECK (status IN ('active','trialing','suspended','churned'))
        ");
        DB::statement("
            ALTER TABLE tenants
            ADD CONSTRAINT tenants_residency_check
            CHECK (data_residency IN ('latam','us','eu'))
        ");
        DB::statement("
            ALTER TABLE tenants
            ADD CONSTRAINT tenants_slug_format
            CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$')
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};

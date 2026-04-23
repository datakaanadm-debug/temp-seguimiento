<?php

/**
 * Migración de spatie/laravel-permission adaptada a modelo polimórfico UUID (model_id).
 * permissions/roles siguen usando bigIncrements (default de spatie).
 *
 * @see https://spatie.be/docs/laravel-permission
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $teams = config('permission.teams', true);
        $teamForeignKey = config('permission.column_names.team_foreign_key', 'tenant_id');

        Schema::create('permissions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 150);
            $table->string('guard_name', 60);
            $table->timestampsTz();

            $table->unique(['name', 'guard_name']);
        });

        Schema::create('roles', function (Blueprint $table) use ($teams, $teamForeignKey) {
            $table->bigIncrements('id');
            if ($teams) {
                $table->foreignUuid($teamForeignKey)->nullable()
                    ->references('id')->on('tenants')->cascadeOnDelete();
            }
            $table->string('name', 150);
            $table->string('guard_name', 60);
            $table->timestampsTz();

            if ($teams) {
                $table->unique([$teamForeignKey, 'name', 'guard_name']);
            } else {
                $table->unique(['name', 'guard_name']);
            }
        });

        Schema::create('model_has_permissions', function (Blueprint $table) use ($teams, $teamForeignKey) {
            $table->unsignedBigInteger('permission_id');
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->string('model_type', 100);
            $table->uuid('model_id');

            if ($teams) {
                $table->foreignUuid($teamForeignKey)
                    ->references('id')->on('tenants')->cascadeOnDelete();
                $table->primary(
                    ['permission_id', $teamForeignKey, 'model_id', 'model_type'],
                    'model_has_permissions_permission_model_type_primary'
                );
            } else {
                $table->primary(['permission_id', 'model_id', 'model_type']);
            }

            $table->index(['model_id', 'model_type']);
        });

        Schema::create('model_has_roles', function (Blueprint $table) use ($teams, $teamForeignKey) {
            $table->unsignedBigInteger('role_id');
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->string('model_type', 100);
            $table->uuid('model_id');

            if ($teams) {
                $table->foreignUuid($teamForeignKey)
                    ->references('id')->on('tenants')->cascadeOnDelete();
                $table->primary(
                    ['role_id', $teamForeignKey, 'model_id', 'model_type'],
                    'model_has_roles_role_model_type_primary'
                );
            } else {
                $table->primary(['role_id', 'model_id', 'model_type']);
            }

            $table->index(['model_id', 'model_type']);
        });

        Schema::create('role_has_permissions', function (Blueprint $table) {
            $table->unsignedBigInteger('permission_id');
            $table->unsignedBigInteger('role_id');
            $table->foreign('permission_id')->references('id')->on('permissions')->cascadeOnDelete();
            $table->foreign('role_id')->references('id')->on('roles')->cascadeOnDelete();
            $table->primary(['permission_id', 'role_id']);
        });

        app()['cache']->forget(config('permission.cache.key', 'spatie.permission.cache'));
    }

    public function down(): void
    {
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
    }
};

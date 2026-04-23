<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // citext para comparación case-insensitive
            $table->string('email', 255)->unique();
            $table->string('password_hash', 255)->nullable(); // null si solo OAuth
            $table->timestampTz('email_verified_at')->nullable();
            $table->string('name', 150);
            $table->text('avatar_url')->nullable();
            $table->string('locale', 10)->default('es-MX');
            $table->string('timezone', 50)->default('America/Mexico_City');
            $table->timestampTz('last_login_at')->nullable();
            $table->text('two_factor_secret')->nullable();
            $table->text('two_factor_recovery_codes')->nullable();
            $table->timestampTz('two_factor_confirmed_at')->nullable();
            $table->string('remember_token', 100)->nullable();
            $table->softDeletesTz();
            $table->timestampsTz();

            $table->index('last_login_at');
            $table->index('email_verified_at');
        });

        // Forzar tipo CITEXT en email (Laravel no lo soporta nativo)
        DB::statement('ALTER TABLE users ALTER COLUMN email TYPE CITEXT');
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};

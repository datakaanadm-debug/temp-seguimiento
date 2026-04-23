<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email', 255)->primary();
            $table->string('token', 255);
            $table->timestampTz('created_at')->nullable();
        });

        DB::statement('ALTER TABLE password_reset_tokens ALTER COLUMN email TYPE CITEXT');
    }

    public function down(): void
    {
        Schema::dropIfExists('password_reset_tokens');
    }
};

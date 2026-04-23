<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('oauth_providers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('provider_user_id', 255);
            $table->string('email', 255)->nullable();
            $table->jsonb('raw_profile')->nullable();
            $table->timestampsTz();

            $table->unique(['provider', 'provider_user_id']);
            $table->index(['user_id', 'provider']);
        });

        DB::statement('ALTER TABLE oauth_providers ALTER COLUMN email TYPE CITEXT');
        DB::statement("
            ALTER TABLE oauth_providers
            ADD CONSTRAINT oauth_providers_provider_check
            CHECK (provider IN ('google','microsoft','github'))
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('oauth_providers');
    }
};

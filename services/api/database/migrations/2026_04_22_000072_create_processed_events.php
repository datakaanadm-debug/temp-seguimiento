<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('processed_events', function (Blueprint $table) {
            // BigInt serial: alto volumen, interno, no se expone por API
            $table->bigIncrements('id');
            $table->uuid('event_id');
            $table->string('handler', 100);
            $table->uuid('tenant_id')->nullable();
            $table->timestampTz('processed_at')->useCurrent();

            $table->unique(['event_id', 'handler']);
            $table->index('processed_at');
            $table->index(['tenant_id', 'processed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('processed_events');
    }
};

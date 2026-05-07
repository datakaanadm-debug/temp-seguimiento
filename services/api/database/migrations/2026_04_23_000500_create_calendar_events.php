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
        Schema::create('calendar_events', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $t->foreignUuid('user_id')->references('id')->on('users')->cascadeOnDelete();
            $t->foreignUuid('created_by')->nullable()->references('id')->on('users')->nullOnDelete();
            $t->timestampTz('starts_at');
            $t->smallInteger('duration_minutes')->default(30);
            $t->string('title', 300);
            $t->string('kind', 30); // meeting|sync|1on1|focus|standup|review|other
            $t->string('location', 200)->nullable();
            $t->text('description')->nullable();
            $t->jsonb('metadata')->default('{}');
            $t->timestampsTz();

            $t->index(['tenant_id', 'user_id', 'starts_at']);
        });

        DB::statement("ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_kind_chk CHECK (kind IN ('meeting','sync','1on1','focus','standup','review','other'))");
        DB::statement("ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON calendar_events
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }

    public function down(): void
    {
        Schema::dropIfExists('calendar_events');
    }
};

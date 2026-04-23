<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('channel', 20);
            $table->string('category', 50);
            $table->boolean('enabled')->default(true);
            $table->string('frequency', 20)->default('immediate');
            $table->jsonb('quiet_hours')->nullable();
            $table->timestampsTz();

            $table->unique(['tenant_id', 'user_id', 'channel', 'category']);
        });

        DB::statement("
            ALTER TABLE notification_preferences
            ADD CONSTRAINT notification_preferences_channel_check
            CHECK (channel IN ('in_app','email','push'))
        ");
        DB::statement("
            ALTER TABLE notification_preferences
            ADD CONSTRAINT notification_preferences_frequency_check
            CHECK (frequency IN ('immediate','hourly','daily','never'))
        ");
        DB::statement("
            ALTER TABLE notification_preferences
            ADD CONSTRAINT notification_preferences_category_check
            CHECK (category IN (
                'task_assigned','task_mentioned','task_due_soon','task_overdue',
                'comment_mentioned','blocker_raised',
                'evaluation_scheduled','evaluation_submitted',
                'daily_digest','weekly_digest'
            ))
        ");

        $this->enableRls('notification_preferences');
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_preferences');
    }

    private function enableRls(string $table): void
    {
        DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY");
        DB::statement("ALTER TABLE {$table} FORCE ROW LEVEL SECURITY");
        DB::statement("
            CREATE POLICY tenant_isolation ON {$table}
            USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
        ");
    }
};

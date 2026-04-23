<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('intern_data', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('profile_id')->constrained()->cascadeOnDelete();
            $table->string('university', 200)->nullable();
            $table->string('career', 150)->nullable();
            $table->unsignedSmallInteger('semester')->nullable();
            $table->integer('mandatory_hours')->nullable();
            $table->integer('hours_completed')->default(0);
            $table->string('university_advisor', 200)->nullable();
            $table->string('university_email', 255)->nullable();
            $table->decimal('gpa', 3, 2)->nullable();
            $table->timestampsTz();

            $table->unique('profile_id');
            $table->index(['tenant_id', 'university']);
        });

        DB::statement('ALTER TABLE intern_data ALTER COLUMN university_email TYPE CITEXT');
        DB::statement("
            ALTER TABLE intern_data
            ADD CONSTRAINT intern_data_semester_check
            CHECK (semester IS NULL OR (semester BETWEEN 1 AND 20))
        ");
        DB::statement("
            ALTER TABLE intern_data
            ADD CONSTRAINT intern_data_hours_check
            CHECK (hours_completed >= 0)
        ");
        DB::statement("
            ALTER TABLE intern_data
            ADD CONSTRAINT intern_data_gpa_check
            CHECK (gpa IS NULL OR (gpa BETWEEN 0 AND 10))
        ");

        $this->enableRls('intern_data');
    }

    public function down(): void
    {
        Schema::dropIfExists('intern_data');
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

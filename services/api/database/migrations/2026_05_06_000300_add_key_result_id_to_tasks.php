<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $t) {
            // Vínculo opcional task → key_result. Cuando existe, el listener
            // recompute el progress del KR como porcentaje de tareas DONE.
            $t->foreignUuid('key_result_id')
                ->nullable()
                ->after('list_id')
                ->references('id')->on('key_results')
                ->nullOnDelete();
            $t->index(['tenant_id', 'key_result_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $t) {
            $t->dropForeign(['key_result_id']);
            $t->dropIndex(['tenant_id', 'key_result_id']);
            $t->dropColumn('key_result_id');
        });
    }
};

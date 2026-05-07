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
        Schema::table('user_points', function (Blueprint $t) {
            $t->jsonb('metadata')->default(DB::raw("'{}'::jsonb"))->after('level');
        });
    }

    public function down(): void
    {
        Schema::table('user_points', function (Blueprint $t) {
            $t->dropColumn('metadata');
        });
    }
};

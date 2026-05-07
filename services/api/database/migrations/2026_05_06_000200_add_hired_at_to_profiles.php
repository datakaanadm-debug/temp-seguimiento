<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('profiles', function (Blueprint $t) {
            // Cuando un practicante es contratado al terminar su programa,
            // se marca aquí. Dispara la badge `legacy-intern` y permite
            // distinguir alumni del programa.
            $t->timestampTz('hired_at')->nullable()->after('end_date');
        });
    }

    public function down(): void
    {
        Schema::table('profiles', function (Blueprint $t) {
            $t->dropColumn('hired_at');
        });
    }
};

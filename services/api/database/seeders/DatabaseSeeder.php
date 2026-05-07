<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            SystemPermissionsSeeder::class,       // permisos atómicos del sistema
            DemoSeeder::class,                    // 3 tenants con data realista
            ReportTemplateSeeder::class,          // plantillas de reporte por tenant
        ]);
    }
}

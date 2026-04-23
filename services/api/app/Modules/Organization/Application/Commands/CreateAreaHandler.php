<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Organization\Domain\Area;
use App\Modules\Organization\Domain\Department;

final class CreateAreaHandler
{
    public function handle(CreateArea $command): Area
    {
        // La global scope de tenant asegura que el department pertenece al tenant actual
        $department = Department::query()->findOrFail($command->departmentId);

        return Area::create([
            'department_id' => $department->id,
            'name' => $command->name,
            'slug' => $command->slug,
            'position' => $command->position,
            'created_by' => $command->actor->id,
            'updated_by' => $command->actor->id,
        ]);
    }
}

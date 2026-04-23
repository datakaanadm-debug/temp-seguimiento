<?php

declare(strict_types=1);

namespace App\Modules\Organization\Application\Commands;

use App\Modules\Organization\Domain\Department;
use App\Modules\Organization\Domain\Events\DepartmentCreated;
use Illuminate\Support\Facades\DB;

final class CreateDepartmentHandler
{
    public function handle(CreateDepartment $command): Department
    {
        return DB::transaction(function () use ($command) {
            $department = Department::create([
                'name' => $command->name,
                'slug' => $command->slug,
                'position' => $command->position,
                'metadata' => $command->metadata,
                'created_by' => $command->actor->id,
                'updated_by' => $command->actor->id,
            ]);

            DB::afterCommit(function () use ($department, $command) {
                event(new DepartmentCreated($department, $command->actor));
            });

            return $department;
        });
    }
}

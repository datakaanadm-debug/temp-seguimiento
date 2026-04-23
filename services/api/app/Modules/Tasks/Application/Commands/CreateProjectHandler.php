<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Application\Commands;

use App\Modules\Organization\Domain\Team;
use App\Modules\Tasks\Domain\Enums\ProjectStatus;
use App\Modules\Tasks\Domain\Events\ProjectCreated;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Domain\TaskList;
use Illuminate\Support\Facades\DB;

final class CreateProjectHandler
{
    private const DEFAULT_LISTS = [
        ['Backlog', 0],
        ['To Do', 1],
        ['En curso', 2],
        ['Revisión', 3],
        ['Hecho', 4],
    ];

    public function handle(CreateProject $command): Project
    {
        $team = Team::query()->findOrFail($command->teamId);

        return DB::transaction(function () use ($command, $team) {
            $project = Project::create([
                'team_id' => $team->id,
                'name' => $command->name,
                'slug' => $command->slug,
                'description' => $command->description,
                'color' => $command->color,
                'status' => ProjectStatus::Active->value,
                'start_date' => $command->startDate,
                'end_date' => $command->endDate,
                'metadata' => [],
                'created_by' => $command->actor->id,
                'updated_by' => $command->actor->id,
            ]);

            if ($command->withDefaultLists) {
                foreach (self::DEFAULT_LISTS as [$name, $pos]) {
                    TaskList::create([
                        'project_id' => $project->id,
                        'name' => $name,
                        'position' => $pos,
                        'created_by' => $command->actor->id,
                    ]);
                }
            }

            DB::afterCommit(function () use ($project, $command) {
                event(new ProjectCreated($project, $command->actor));
            });

            return $project;
        });
    }
}

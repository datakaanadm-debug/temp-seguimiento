<?php

declare(strict_types=1);

namespace App\Modules\Tasks\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Tasks\Domain\TaskList
 */
final class TaskListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'position' => $this->position,
            'color' => $this->color,
            'wip_limit' => $this->wip_limit,
            'task_count' => $this->whenCounted('tasks'),
        ];
    }
}

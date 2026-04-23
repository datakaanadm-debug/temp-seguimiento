<?php

declare(strict_types=1);

namespace App\Modules\Performance\Application\Commands;

use App\Modules\Identity\Domain\User;

final readonly class CreateScorecard
{
    /**
     * @param list<array{key:string,label:string,type:string,source?:?string,target_value?:?float,unit?:?string,weight?:float,config?:array,position?:int}> $metrics
     */
    public function __construct(
        public User $actor,
        public string $name,
        public ?string $description = null,
        public string $applicableTo = 'intern',
        public array $metrics = [],
    ) {}
}

<?php

declare(strict_types=1);

namespace App\Providers;

use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Http\Policies\InvitationPolicy;
use App\Modules\Organization\Domain\Area;
use App\Modules\Organization\Domain\Department;
use App\Modules\Organization\Domain\Team;
use App\Modules\Organization\Http\Policies\AreaPolicy;
use App\Modules\Organization\Http\Policies\DepartmentPolicy;
use App\Modules\Organization\Http\Policies\TeamPolicy;
use App\Modules\People\Domain\MentorAssignment;
use App\Modules\People\Domain\Profile;
use App\Modules\People\Http\Policies\MentorAssignmentPolicy;
use App\Modules\People\Http\Policies\ProfilePolicy;
use App\Modules\Tasks\Domain\Project;
use App\Modules\Tasks\Domain\Task;
use App\Modules\Tasks\Http\Policies\ProjectPolicy;
use App\Modules\Tasks\Http\Policies\TaskPolicy;
use App\Modules\Tracking\Domain\Blocker;
use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Http\Policies\BlockerPolicy;
use App\Modules\Tracking\Http\Policies\DailyReportPolicy;
use App\Modules\Performance\Domain\Evaluation;
use App\Modules\Performance\Domain\Scorecard;
use App\Modules\Performance\Http\Policies\EvaluationPolicy;
use App\Modules\Performance\Http\Policies\ScorecardPolicy;
use App\Modules\Reports\Domain\ReportRun;
use App\Modules\Reports\Domain\ReportTemplate;
use App\Modules\Reports\Http\Policies\ReportRunPolicy;
use App\Modules\Reports\Http\Policies\ReportTemplatePolicy;
use App\Modules\AI\Domain\AiInsight;
use App\Modules\AI\Http\Policies\AiInsightPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        // Identity
        Invitation::class => InvitationPolicy::class,

        // Organization
        Department::class => DepartmentPolicy::class,
        Area::class => AreaPolicy::class,
        Team::class => TeamPolicy::class,

        // People
        Profile::class => ProfilePolicy::class,
        MentorAssignment::class => MentorAssignmentPolicy::class,

        // Tasks
        Project::class => ProjectPolicy::class,
        Task::class => TaskPolicy::class,

        // Tracking
        DailyReport::class => DailyReportPolicy::class,
        Blocker::class => BlockerPolicy::class,

        // Performance
        Scorecard::class => ScorecardPolicy::class,
        Evaluation::class => EvaluationPolicy::class,

        // Reports
        ReportTemplate::class => ReportTemplatePolicy::class,
        ReportRun::class => ReportRunPolicy::class,

        // AI
        AiInsight::class => AiInsightPolicy::class,
    ];

    public function boot(): void
    {
        $this->registerPolicies();
    }
}

<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Infrastructure\Listeners;

use App\Modules\Audit\Application\Services\ActivityLogger;
use App\Modules\Tracking\Domain\Blocker;
use App\Modules\Tracking\Domain\DailyReport;
use App\Modules\Tracking\Domain\Events\BlockerRaised;
use App\Modules\Tracking\Domain\Events\BlockerResolved;
use App\Modules\Tracking\Domain\Events\DailyReportReviewed;
use App\Modules\Tracking\Domain\Events\DailyReportSubmitted;
use Illuminate\Support\Facades\DB;

final class AuditTrackingActivity
{
    public function handle(
        DailyReportSubmitted|DailyReportReviewed|BlockerRaised|BlockerResolved $event,
    ): void {
        match (true) {
            $event instanceof DailyReportSubmitted => $this->logReportSubmitted($event),
            $event instanceof DailyReportReviewed => $this->logReportReviewed($event),
            $event instanceof BlockerRaised => $this->logBlockerRaised($event),
            $event instanceof BlockerResolved => $this->logBlockerResolved($event),
        };
    }

    private function logReportSubmitted(DailyReportSubmitted $e): void
    {
        $authorName = DB::table('users')->where('id', $e->report->user_id)->value('name') ?? 'Practicante';
        ActivityLogger::record(
            tenantId: $e->report->tenant_id,
            logName: 'tracking',
            event: 'daily_report_submitted',
            description: "{$authorName} envió su bitácora del " . ($e->report->date?->format('Y-m-d') ?? 'hoy'),
            subjectType: DailyReport::class,
            subjectId: $e->report->id,
            causerId: $e->report->user_id,
            properties: [
                'date' => $e->report->date?->toIso8601String(),
                'hours_worked' => $e->report->hours_worked ?? null,
            ],
        );
    }

    private function logReportReviewed(DailyReportReviewed $e): void
    {
        $reviewerName = property_exists($e, 'reviewer') && $e->reviewer
            ? ($e->reviewer->name ?? 'Mentor')
            : 'Mentor';
        ActivityLogger::record(
            tenantId: $e->report->tenant_id,
            logName: 'tracking',
            event: 'daily_report_reviewed',
            description: "{$reviewerName} revisó una bitácora",
            subjectType: DailyReport::class,
            subjectId: $e->report->id,
            causerId: property_exists($e, 'reviewer') ? ($e->reviewer->id ?? null) : null,
            properties: ['date' => $e->report->date?->toIso8601String()],
        );
    }

    private function logBlockerRaised(BlockerRaised $e): void
    {
        $authorName = DB::table('users')
            ->where('id', $e->blocker->raised_by_user_id ?? $e->blocker->user_id ?? null)
            ->value('name') ?? 'Practicante';
        ActivityLogger::record(
            tenantId: $e->blocker->tenant_id,
            logName: 'tracking',
            event: 'blocker_raised',
            description: "{$authorName} reportó un bloqueador",
            subjectType: Blocker::class,
            subjectId: $e->blocker->id,
            causerId: $e->blocker->raised_by_user_id ?? $e->blocker->user_id ?? null,
            properties: ['title' => $e->blocker->title ?? null],
        );
    }

    private function logBlockerResolved(BlockerResolved $e): void
    {
        ActivityLogger::record(
            tenantId: $e->blocker->tenant_id,
            logName: 'tracking',
            event: 'blocker_resolved',
            description: ($e->resolver->name ?? 'Alguien') . ' resolvió un bloqueador',
            subjectType: Blocker::class,
            subjectId: $e->blocker->id,
            causerId: $e->resolver->id,
            properties: ['title' => $e->blocker->title ?? null],
        );
    }
}

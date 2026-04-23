<?php

declare(strict_types=1);

namespace App\Modules\Notifications\Infrastructure\Notifications;

use App\Modules\Notifications\Domain\Enums\NotificationCategory;
use App\Modules\Tracking\Domain\DailyReport;
use Illuminate\Notifications\Messages\MailMessage;

final class DailyReportSubmittedNotification extends BaseNotification
{
    public function __construct(
        public readonly DailyReport $report,
    ) {}

    public function category(): NotificationCategory
    {
        return NotificationCategory::DailyDigest;
    }

    public function toDatabase(mixed $notifiable): array
    {
        $authorName = $this->report->user?->name ?? 'Un practicante';
        return [
            'category' => $this->category()->value,
            'title' => "{$authorName} envió su reporte diario",
            'body' => \Illuminate\Support\Str::limit($this->report->progress_summary, 200),
            'report_id' => $this->report->id,
            'user_id' => $this->report->user_id,
            'report_date' => $this->report->report_date->toDateString(),
            'tenant_id' => $this->report->tenant_id,
        ];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $url = rtrim(config('app.frontend_url'), '/') . "/reportes/{$this->report->id}";
        $authorName = $this->report->user?->name ?? 'Un practicante';
        return (new MailMessage())
            ->subject("{$authorName} envió su reporte del {$this->report->report_date->format('d/m/Y')}")
            ->greeting("Hola {$notifiable->name},")
            ->line("{$authorName} acaba de enviar su reporte diario.")
            ->action('Ver reporte', $url);
    }
}

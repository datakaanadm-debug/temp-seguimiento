<?php

declare(strict_types=1);

namespace App\Modules\Identity\Infrastructure\Notifications;

use App\Modules\Identity\Domain\Invitation;
use App\Modules\Identity\Domain\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Email enviado al invitado con el link que contiene el token en claro.
 *
 * El token solo se envía por email (nunca persistido en claro). Si el email se pierde,
 * el admin debe re-invitar (genera un nuevo token y revoca el anterior).
 */
final class InvitationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Invitation $invitation,
        public readonly Tenant $tenant,
        public readonly string $plainToken,
        public readonly string $inviterName,
    ) {}

    public function viaQueues(): array
    {
        return ['mail' => 'notifications'];
    }

    public function via(mixed $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(mixed $notifiable): MailMessage
    {
        $acceptUrl = rtrim(config('app.frontend_url', 'https://interna.app'), '/')
            . "/{$this->tenant->slug}/invitaciones/aceptar"
            . "?token={$this->plainToken}"
            . "&email=" . urlencode($this->invitation->email);

        $roleLabel = $this->invitation->role->label();
        $expiresAt = $this->invitation->expires_at->locale('es')->isoFormat('LLL');

        // Vista HTML con branding del tenant (logo, brand_primary, brand_dark).
        // Fallback a MailMessage default si la vista falla (defensivo).
        return (new MailMessage())
            ->subject("Te invitaron a {$this->tenant->name} en Interna")
            ->view('emails.invitation', [
                'tenant' => $this->tenant,
                'invitation' => $this->invitation,
                'inviterName' => $this->inviterName,
                'roleLabel' => $roleLabel,
                'acceptUrl' => $acceptUrl,
                'expiresAt' => $expiresAt,
            ]);
    }

    /**
     * Sanctum Notification routing: enviar al email de la invitación, no al user.
     */
    public function routeNotificationForMail(mixed $notifiable): string
    {
        return $this->invitation->email;
    }
}

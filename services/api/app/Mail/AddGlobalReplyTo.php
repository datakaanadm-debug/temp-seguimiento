<?php

declare(strict_types=1);

namespace App\Mail;

use Illuminate\Mail\Events\MessageSending;

/**
 * Inyecta Reply-To global (config mail.reply_to) en cada mensaje saliente,
 * salvo que el mensaje ya tenga su propio Reply-To definido.
 *
 * Se aplica a Notifications, Mailables y `Mail::raw(...)` por igual.
 */
final class AddGlobalReplyTo
{
    public function handle(MessageSending $event): void
    {
        $address = (string) config('mail.reply_to.address', '');
        if ($address === '') {
            return;
        }

        $message = $event->message;
        if (!empty($message->getReplyTo())) {
            return;
        }

        $name = (string) (config('mail.reply_to.name') ?? '');
        $message->replyTo($address, $name !== '' ? $name : null);
    }
}

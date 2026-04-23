<?php

declare(strict_types=1);

namespace App\Modules\Tracking\Domain\Enums;

enum Mood: string
{
    case Great = 'great';
    case Good = 'good';
    case Ok = 'ok';
    case Stressed = 'stressed';
    case Blocked = 'blocked';

    public function label(): string
    {
        return match ($this) {
            self::Great => 'Excelente',
            self::Good => 'Bien',
            self::Ok => 'Ok',
            self::Stressed => 'Estresado',
            self::Blocked => 'Bloqueado',
        };
    }

    public function emoji(): string
    {
        return match ($this) {
            self::Great => '\u{1F603}',
            self::Good => '\u{1F642}',
            self::Ok => '\u{1F610}',
            self::Stressed => '\u{1F623}',
            self::Blocked => '\u{1F6D1}',
        };
    }
}

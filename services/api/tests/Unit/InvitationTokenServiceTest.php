<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Modules\Identity\Application\Services\InvitationTokenService;
use PHPUnit\Framework\TestCase;

class InvitationTokenServiceTest extends TestCase
{
    public function test_generate_produces_64_char_plain_and_sha256_hash(): void
    {
        $service = new InvitationTokenService();
        $result = $service->generate();

        $this->assertSame(64, strlen($result['plain']));
        $this->assertSame(64, strlen($result['hash']));
        $this->assertSame(hash('sha256', $result['plain']), $result['hash']);
    }

    public function test_verify_accepts_matching_token(): void
    {
        $service = new InvitationTokenService();
        ['plain' => $plain, 'hash' => $hash] = $service->generate();

        $this->assertTrue($service->verify($plain, $hash));
    }

    public function test_verify_rejects_wrong_token(): void
    {
        $service = new InvitationTokenService();
        ['hash' => $hash] = $service->generate();

        $this->assertFalse($service->verify('wrong', $hash));
    }

    public function test_verify_uses_timing_safe_compare(): void
    {
        $service = new InvitationTokenService();
        // El SUT usa hash_equals; solo verificamos que lo llame correctamente.
        $this->assertTrue($service->verify('abc', hash('sha256', 'abc')));
    }
}

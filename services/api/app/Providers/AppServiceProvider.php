<?php

declare(strict_types=1);

namespace App\Providers;

use App\Modules\AI\Application\Contracts\LlmClient;
use App\Modules\AI\Infrastructure\Clients\ClaudeLlmClient;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // Binding del LLM client según config('ai.provider')
        $this->app->singleton(LlmClient::class, function () {
            return match (config('ai.provider', 'claude')) {
                'claude' => new ClaudeLlmClient(),
                // fase 2: 'openai' => new OpenAiLlmClient(),
                default => throw new \RuntimeException(
                    'Unsupported AI provider: ' . config('ai.provider')
                ),
            };
        });
    }

    public function boot(): void
    {
        // nothing for now
    }
}

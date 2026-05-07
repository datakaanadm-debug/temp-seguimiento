<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Modules\Gamification\Application\RecentAwardsCollector;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Después de procesar el request, si el GamificationService otorgó alguna
 * badge nueva durante el ciclo (síncrono, vía listeners), inyecta el array
 * en el JSON bajo `_awarded_badges`.
 *
 * El frontend (api-client) intercepta esa clave y dispara un toast con
 * `sonner` + invalida queries de gamificación.
 *
 * No toca:
 *   - responses no-JSON (PDFs, archivos)
 *   - responses con status 4xx/5xx (errores no son momento de celebrar)
 *   - rutas no-/api/ (assets, etc.)
 */
final class AppendRecentAwards
{
    public function __construct(private readonly RecentAwardsCollector $collector) {}

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Sólo nos interesan responses JSON exitosas de la API
        if (
            !$response instanceof JsonResponse
            || $response->getStatusCode() >= 400
            || !str_starts_with($request->path(), 'api/')
        ) {
            return $response;
        }

        if ($this->collector->isEmpty()) {
            return $response;
        }

        $data = $response->getData(true);
        if (!is_array($data)) {
            return $response;
        }

        $data['_awarded_badges'] = $this->collector->all();
        $response->setData($data);

        return $response;
    }
}

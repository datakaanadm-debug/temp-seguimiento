<?php

declare(strict_types=1);

namespace App\Shared\Storage;

use App\Shared\Tenancy\TenantContext;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Storage helper con paths siempre bajo `tenants/{tenant_id}/`.
 *
 * Nunca exponer URLs públicas de R2 directamente: todo acceso pasa por pre-signed URLs
 * generadas en backend. Esto nos permite re-verificar autorización por request.
 *
 * @see docs/architecture/02-multi-tenancy.md sección 9
 */
final class TenantStorage
{
    public const DISK = 'r2';

    public static function path(string $segment): string
    {
        $tenantId = TenantContext::currentId();
        return "tenants/{$tenantId}/" . ltrim($segment, '/');
    }

    /**
     * Genera un key único para un nuevo upload.
     */
    public static function buildAttachmentKey(string $subjectType, string $subjectId, string $originalName): string
    {
        $shortType = Str::afterLast($subjectType, '\\');
        $slug = Str::slug(pathinfo($originalName, PATHINFO_FILENAME), separator: '-');
        $ext = pathinfo($originalName, PATHINFO_EXTENSION);
        $ext = $ext !== '' ? ".{$ext}" : '';
        $uuid = Str::uuid()->toString();
        $folder = strtolower($shortType);

        // tenants/{tid}/attachments/task/{taskId}/{uuid}-{slug}.ext
        return self::path("attachments/{$folder}/{$subjectId}/{$uuid}-{$slug}{$ext}");
    }

    /**
     * URL pre-firmada para DESCARGA (GET). TTL corto (15 min default).
     *
     * Devuelve `null` cuando el driver no soporta pre-signed URLs (típico
     * disk `local` en dev). El caller debe caer a un endpoint backend
     * que stream el archivo.
     */
    public static function temporaryUrl(string $key, int $ttlSeconds = 900): ?string
    {
        try {
            return Storage::disk(self::DISK)->temporaryUrl($key, now()->addSeconds($ttlSeconds));
        } catch (\RuntimeException) {
            // Local/in-memory drivers no implementan temporaryUrl.
            return null;
        }
    }

    /**
     * URL pre-firmada para UPLOAD (PUT). TTL corto (5 min default).
     *
     * @return array{url: string, key: string, headers: array<string,string>}
     */
    public static function presignedUploadUrl(
        string $key,
        string $contentType,
        int $maxBytes,
        int $ttlSeconds = 300,
    ): array {
        /** @var \Illuminate\Filesystem\AwsS3V3Adapter $disk */
        $disk = Storage::disk(self::DISK);
        $client = $disk->getClient();
        $bucket = config('filesystems.disks.' . self::DISK . '.bucket');

        $cmd = $client->getCommand('PutObject', [
            'Bucket' => $bucket,
            'Key' => $key,
            'ContentType' => $contentType,
            'ContentLength' => $maxBytes,
        ]);

        $request = $client->createPresignedRequest($cmd, "+{$ttlSeconds} seconds");

        return [
            'url' => (string) $request->getUri(),
            'key' => $key,
            'headers' => [
                'Content-Type' => $contentType,
            ],
        ];
    }

    public static function delete(string $key): bool
    {
        return Storage::disk(self::DISK)->delete($key);
    }

    public static function exists(string $key): bool
    {
        return Storage::disk(self::DISK)->exists($key);
    }

    /**
     * Valida que el key pertenece al tenant actual. Defensa extra contra IDOR.
     */
    public static function assertBelongsToCurrentTenant(string $key): void
    {
        $expectedPrefix = 'tenants/' . TenantContext::currentId() . '/';
        if (!str_starts_with($key, $expectedPrefix)) {
            abort(403, 'Key does not belong to current tenant');
        }
    }
}

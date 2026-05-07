@php
    $brand = $tenant->theme ?? [];
    $primary = $brand['brand_primary'] ?? '#3a5f8a';
    $primaryDark = $brand['brand_dark'] ?? '#1f3a5e';
    $logoUrl = $brand['logo_url'] ?? null;
    $tenantName = $tenant->name;
@endphp
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <title>Invitación a {{ $tenantName }}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1a1a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
                    {{-- Header con branding del tenant --}}
                    <tr>
                        <td align="center" style="background:{{ $primary }};padding:28px 24px;">
                            @if ($logoUrl)
                                <img
                                    src="{{ $logoUrl }}"
                                    alt="{{ $tenantName }}"
                                    height="40"
                                    style="display:block;max-height:40px;width:auto;border:0;"
                                />
                            @else
                                <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#ffffff;letter-spacing:-0.3px;">
                                    {{ $tenantName }}
                                </div>
                            @endif
                        </td>
                    </tr>

                    {{-- Cuerpo --}}
                    <tr>
                        <td style="padding:32px 32px 8px;">
                            <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;line-height:1.3;color:#1a1a1a;font-weight:normal;letter-spacing:-0.2px;">
                                Te invitaron a <strong style="color:{{ $primaryDark }};">{{ $tenantName }}</strong>
                            </h1>
                            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a3a3a;">
                                Hola,
                            </p>
                            <p style="margin:0 0 14px;font-size:14.5px;line-height:1.6;color:#3a3a3a;">
                                <strong>{{ $inviterName }}</strong> te invitó a unirte a {{ $tenantName }} en
                                <span style="color:{{ $primaryDark }};font-weight:600;">Interna</span>
                                como <strong>{{ $roleLabel }}</strong>.
                            </p>
                            <p style="margin:0 0 28px;font-size:14.5px;line-height:1.6;color:#3a3a3a;">
                                Acepta tu invitación para configurar tu contraseña y empezar a colaborar.
                            </p>

                            {{-- CTA --}}
                            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                                <tr>
                                    <td>
                                        <a
                                            href="{{ $acceptUrl }}"
                                            style="display:inline-block;background:{{ $primary }};color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:8px;letter-spacing:0.2px;"
                                        >
                                            Aceptar invitación
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin:0 0 14px;font-size:12.5px;line-height:1.5;color:#6a6a6a;">
                                Esta invitación expira el <strong>{{ $expiresAt }}</strong>.
                            </p>
                            <p style="margin:0 0 14px;font-size:12.5px;line-height:1.5;color:#6a6a6a;">
                                Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            <p style="margin:0 0 24px;font-size:11.5px;line-height:1.5;color:#3a3a3a;word-break:break-all;font-family:'SF Mono',Menlo,Consolas,monospace;background:#f7f5f1;padding:10px 12px;border-radius:6px;border:1px solid #e8e4dd;">
                                {{ $acceptUrl }}
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="border-top:1px solid #ece8e0;padding:18px 32px;background:#fafaf7;">
                            <p style="margin:0;font-size:11.5px;line-height:1.5;color:#8a8a8a;">
                                Si no esperabas este correo, puedes ignorarlo — la invitación expirará sola.
                            </p>
                            <p style="margin:8px 0 0;font-size:11.5px;line-height:1.5;color:#8a8a8a;">
                                Enviado por <span style="color:{{ $primaryDark }};font-weight:600;">{{ $tenantName }}</span> vía Interna.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

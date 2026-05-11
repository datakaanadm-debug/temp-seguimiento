<?php

declare(strict_types=1);

namespace App\Modules\People\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\People\Domain\Profile
 */
final class ProfileResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $actor = $request->user();
        $isSelf = $actor?->id === $this->user_id;
        $isStaff = $actor?->primaryRole()?->isStaff() ?? false;

        // Resolver el rol efectivo desde memberships (fuente de verdad: role, no kind).
        // Si el caller eager-loadeó `activeMembership` (vía with()), usar esa instancia
        // — cero queries. Si no, fallback a DB::table (slow path, evitarlo).
        // Fix N+1: ProfileController::index/show ahora carga `activeMembership`.
        if ($this->relationLoaded('activeMembership')) {
            $role = $this->activeMembership?->role;
        } else {
            $membership = \DB::table('memberships')
                ->where('tenant_id', $this->tenant_id)
                ->where('user_id', $this->user_id)
                ->where('status', 'active')
                ->first();
            $role = $membership?->role;
        }
        $role = is_string($role) ? $role : ($role?->value ?? null);
        $roleLabel = $role ? $this->roleLabel($role) : null;

        $base = [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'kind' => $this->kind->value,
            'kind_label' => $this->kind->label(),
            'role' => $role,
            'role_label' => $roleLabel,
            'bio' => $this->bio,
            'position_title' => $this->position_title,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'hired_at' => $this->hired_at?->toIso8601String(),
            'skills' => $this->skills ?? [],
            'social_links' => $this->social_links ?? new \stdClass(),
            'user' => $this->whenLoaded('user', fn () => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'email' => $this->user->email,
                'avatar_url' => $this->user->avatar_url,
            ]),
            'intern_data' => InternDataResource::make($this->whenLoaded('internData')),
            'mentor_data' => MentorDataResource::make($this->whenLoaded('mentorData')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];

        // PII visible solo para el mismo user o para staff
        if ($isSelf || $isStaff) {
            $base['phone'] = $this->phone;
            $base['birth_date'] = $this->birth_date?->toDateString();
            $base['emergency_contact'] = $this->emergency_contact ?? new \stdClass();
        }

        // national_id solo visible al propio user o admin/HR
        if ($isSelf || in_array($actor?->primaryRole()?->value, ['tenant_admin', 'hr'], true)) {
            $base['national_id'] = $this->national_id;
        }

        return $base;
    }

    private function roleLabel(string $role): string
    {
        return match ($role) {
            'tenant_admin' => 'Admin',
            'hr' => 'RRHH',
            'team_lead' => 'Líder de equipo',
            'mentor' => 'Mentor',
            'intern' => 'Practicante',
            'supervisor' => 'Supervisor',
            'viewer' => 'Observador',
            default => ucfirst($role),
        };
    }
}

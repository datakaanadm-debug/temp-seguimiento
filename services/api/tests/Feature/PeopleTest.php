<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Modules\Identity\Domain\Enums\MembershipRole;
use App\Modules\People\Application\Commands\AssignMentor;
use App\Modules\People\Application\Commands\AssignMentorHandler;
use App\Modules\People\Application\Commands\UnassignMentor;
use App\Modules\People\Application\Commands\UnassignMentorHandler;
use App\Modules\People\Application\Commands\UpdateProfile;
use App\Modules\People\Application\Commands\UpdateProfileHandler;
use App\Modules\People\Application\Commands\UpsertInternData;
use App\Modules\People\Application\Commands\UpsertInternDataHandler;
use App\Modules\People\Domain\Enums\AssignmentStatus;
use App\Modules\People\Domain\Exceptions\MentorCapacityExceeded;
use App\Modules\People\Domain\MentorAssignment;
use App\Modules\People\Domain\MentorData;
use App\Modules\People\Domain\Profile;
use App\Shared\Tenancy\TenantContext;
use Tests\TestCase;

class PeopleTest extends TestCase
{
    public function test_update_profile_cifra_phone_y_national_id_en_db(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $profile = Profile::create([
            'user_id' => $admin->id,
            'kind' => 'staff',
        ]);

        app(UpdateProfileHandler::class)->handle(new UpdateProfile(
            profileId: $profile->id,
            actor: $admin,
            fields: [
                'phone' => '+52 55 1234 5678',
                'national_id' => 'ABC123456789',
                'bio' => 'Hola soy staff.',
            ],
        ));

        // Raw en DB: no debe coincidir con los valores claros
        $raw = \DB::table('profiles')->where('id', $profile->id)->first();
        $this->assertNotSame('+52 55 1234 5678', $raw->phone);
        $this->assertNotSame('ABC123456789', $raw->national_id);

        // Vía modelo: sí descifra
        $fresh = Profile::find($profile->id);
        $this->assertSame('+52 55 1234 5678', $fresh->phone);
        $this->assertSame('ABC123456789', $fresh->national_id);
        $this->assertSame('Hola soy staff.', $fresh->bio);
    }

    public function test_upsert_intern_data_crea_y_actualiza(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $internUser = $this->createUser();
        $this->createMembership($tenant, $internUser, MembershipRole::Intern);

        $profile = Profile::create([
            'user_id' => $internUser->id,
            'kind' => 'intern',
        ]);

        $first = app(UpsertInternDataHandler::class)->handle(new UpsertInternData(
            profileId: $profile->id,
            actor: $admin,
            fields: [
                'university' => 'UNAM',
                'career' => 'Diseño',
                'semester' => 8,
                'mandatory_hours' => 480,
                'hours_completed' => 120,
            ],
        ));
        $this->assertSame('UNAM', $first->university);

        // Update: mismo endpoint actualiza el record existente
        $second = app(UpsertInternDataHandler::class)->handle(new UpsertInternData(
            profileId: $profile->id,
            actor: $admin,
            fields: ['hours_completed' => 200],
        ));
        $this->assertSame($first->id, $second->id);
        $this->assertSame(200, $second->hours_completed);
        $this->assertSame('UNAM', $second->university);  // no se tocó
    }

    public function test_assign_mentor_sustituye_al_anterior(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $mentorA = $this->createUser('mentor-a@p.test');
        $mentorB = $this->createUser('mentor-b@p.test');
        $intern = $this->createUser('intern-p@p.test');

        $first = app(AssignMentorHandler::class)->handle(
            new AssignMentor($intern->id, $mentorA->id, $admin)
        );
        $this->assertSame(AssignmentStatus::Active, $first->status);

        // Asignar otro mentor al mismo intern: el primero se termina
        $second = app(AssignMentorHandler::class)->handle(
            new AssignMentor($intern->id, $mentorB->id, $admin)
        );
        $this->assertSame(AssignmentStatus::Active, $second->status);

        $firstFresh = MentorAssignment::find($first->id);
        $this->assertSame(AssignmentStatus::Ended, $firstFresh->status);
        $this->assertNotNull($firstFresh->ended_at);

        // Constraint unique partial no debe haberse violado
        $activeCount = MentorAssignment::where('intern_user_id', $intern->id)
            ->where('status', 'active')->count();
        $this->assertSame(1, $activeCount);
    }

    public function test_assign_mentor_rechaza_si_capacidad_excedida(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $mentor = $this->createUser('over@p.test');
        $mentorProfile = Profile::create(['user_id' => $mentor->id, 'kind' => 'mentor']);
        MentorData::create([
            'profile_id' => $mentorProfile->id,
            'max_mentees' => 1,
            'expertise' => [],
            'availability' => [],
        ]);

        $intern1 = $this->createUser();
        $intern2 = $this->createUser();

        app(AssignMentorHandler::class)->handle(new AssignMentor($intern1->id, $mentor->id, $admin));

        $this->expectException(MentorCapacityExceeded::class);
        app(AssignMentorHandler::class)->handle(new AssignMentor($intern2->id, $mentor->id, $admin));
    }

    public function test_unassign_mentor_marca_ended_y_es_idempotente(): void
    {
        $tenant = $this->createTenant();
        $admin = $this->createUser();
        $this->createMembership($tenant, $admin, MembershipRole::TenantAdmin);
        TenantContext::setCurrent($tenant);

        $mentor = $this->createUser();
        $intern = $this->createUser();

        $a = app(AssignMentorHandler::class)->handle(
            new AssignMentor($intern->id, $mentor->id, $admin)
        );

        app(UnassignMentorHandler::class)->handle(new UnassignMentor($a->id, $admin));
        $fresh = MentorAssignment::find($a->id);
        $this->assertSame(AssignmentStatus::Ended, $fresh->status);

        // Idempotente
        $again = app(UnassignMentorHandler::class)->handle(new UnassignMentor($a->id, $admin));
        $this->assertSame(AssignmentStatus::Ended, $again->status);
    }
}

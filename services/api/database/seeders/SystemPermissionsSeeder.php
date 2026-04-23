<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class SystemPermissionsSeeder extends Seeder
{
    /**
     * Permisos atómicos del sistema. No pertenecen a un tenant — son globales (roles custom de
     * cada tenant se componen de subsets de estos).
     */
    public function run(): void
    {
        $permissions = [
            // Tenancy / admin
            'tenant.manage_billing',
            'tenant.manage_integrations',
            'tenant.manage_branding',
            'tenant.view_audit_log',
            'tenant.invite_user',
            'tenant.manage_roles',

            // People
            'intern.view', 'intern.invite', 'intern.update', 'intern.change_status', 'intern.assign_mentor',
            'mentor.view', 'mentor.update',
            'profile.view_self', 'profile.update_self', 'profile.view_any', 'profile.update_any',

            // Organization
            'organization.view', 'organization.update', 'team.create', 'team.update', 'team.delete',

            // Tasks
            'task.view', 'task.create', 'task.update', 'task.delete', 'task.assign', 'task.change_state',
            'comment.create', 'comment.update_own', 'comment.delete_own', 'comment.delete_any',
            'attachment.upload', 'attachment.delete',
            'time_entry.create_own', 'time_entry.update_own', 'time_entry.view_any',
            'tag.manage',

            // Tracking
            'daily_report.create_own', 'daily_report.update_own', 'daily_report.view_any', 'daily_report.review',
            'blocker.raise', 'blocker.resolve',

            // Performance
            'scorecard.manage',
            'evaluation.create', 'evaluation.update', 'evaluation.sign', 'evaluation.view', 'evaluation.view_any',

            // Reports
            'report.view', 'report.generate', 'report.download', 'report.export',

            // Notifications
            'notification.view_own', 'notification.update_preferences',

            // AI
            'ai.use', 'ai.view_insights', 'ai.dismiss_insight',
        ];

        foreach ($permissions as $name) {
            Permission::updateOrCreate(
                ['name' => $name, 'guard_name' => 'web'],
                []
            );
            Permission::updateOrCreate(
                ['name' => $name, 'guard_name' => 'sanctum'],
                []
            );
        }

        $this->command?->info('Seeded ' . count($permissions) . ' system permissions (×2 guards).');
    }
}

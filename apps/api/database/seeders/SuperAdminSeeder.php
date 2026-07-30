<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class SuperAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $superadminRole = Role::where('name', 'superadmin')->first();

        $email = env('SUPERADMIN_EMAIL', 'admin@example.com');
        $password = env('SUPERADMIN_PASSWORD', 'password123');

        $user = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'Super Admin',
                'password' => Hash::make($password),
            ]
        );

        if ($superadminRole && !$user->roles()->where('role_id', $superadminRole->id)->exists()) {
            $user->roles()->attach($superadminRole->id);
        }
    }
}

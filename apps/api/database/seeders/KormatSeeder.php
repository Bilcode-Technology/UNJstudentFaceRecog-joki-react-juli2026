<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class KormatSeeder extends Seeder
{
    /**
     * Run the database seeds for KORMAT accounts.
     */
    public function run(): void
    {
        $kormatRole = Role::where('name', 'kormat')->first();

        if (!$kormatRole) {
            $this->command->error("Role 'kormat' tidak ditemukan.");
            return;
        }

        $kormats = [
            [
                'name' => 'KORMAT A',
                'email' => 'kormata@example.com',
                'password' => Hash::make('password123'),
            ],
            [
                'name' => 'KORMAT B',
                'email' => 'kormatb@example.com',
                'password' => Hash::make('password123'),
            ],
        ];

        foreach ($kormats as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $data['password'],
                ]
            );

            if (!$user->roles()->where('role_id', $kormatRole->id)->exists()) {
                $user->roles()->attach($kormatRole->id);
            }

            $this->command->info("KORMAT Created: {$data['name']} ({$data['email']}) / password123");
        }
    }
}

<?php

namespace App\Console\Commands;

use App\Models\Role;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class MakeKormatCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:kormat {name} {email} {password=password123}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a new KORMAT user account with kormat role assigned';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $name = $this->argument('name');
        $email = $this->argument('email');
        $password = $this->argument('password');

        $kormatRole = Role::where('name', 'kormat')->first();

        if (!$kormatRole) {
            $this->error("Role 'kormat' tidak ditemukan di database.");
            return Command::FAILURE;
        }

        if (User::where('email', $email)->exists()) {
            $this->error("Email '{$email}' sudah terdaftar.");
            return Command::FAILURE;
        }

        $user = User::create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make($password),
        ]);

        $user->roles()->attach($kormatRole->id);

        $this->info("Berhasil membuat akun KORMAT: {$name} ({$email}) dengan password: {$password}");

        return Command::SUCCESS;
    }
}

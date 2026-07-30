<?php

namespace App\Services;

use App\Models\FaceEncoding;
use App\Models\Role;
use App\Models\User;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use ValidationException;

class AuthService
{
    protected FaceRecognitionService $faceService;

    public function __construct(FaceRecognitionService $faceService)
    {
        $this->faceService = $faceService;
    }

    /**
     * Handles Mahasiswa registration with mandatory face encoding within DB transaction.
     */
    public function register(array $data): User
    {
        // Step 1: Encode face image via FaceRecognitionService (throws FaceEncodingException if invalid/missing face)
        $encoding = $this->faceService->encode($data['face_image']);

        // Step 2: Atomic database transaction for user creation, role assignment, and face_encodings persistence
        return DB::transaction(function () use ($data, $encoding) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'nim' => $data['nim'] ?? null,
                'angkatan' => $data['angkatan'] ?? null,
            ]);

            // Assign 'mahasiswa' role by default
            $mahasiswaRole = Role::where('name', 'mahasiswa')->firstOrFail();
            $user->roles()->attach($mahasiswaRole->id);

            // Save face encoding
            FaceEncoding::create([
                'user_id' => $user->id,
                'encoding' => $encoding,
            ]);

            return $user->load('roles');
        });
    }

    /**
     * Verifies user credentials and generates a Sanctum API token.
     */
    public function login(array $credentials): array
    {
        $user = User::where('email', $credentials['email'])->first();

        if (!$user || !Hash::check($credentials['password'], $user->password)) {
            throw new AuthenticationException('Email atau password salah');
        }

        if (isset($user->is_active) && $user->is_active === false) {
            throw new AuthorizationException('Akun dinonaktifkan, hubungi administrator');
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return [
            'token' => $token,
            'user' => $user->load('roles'),
        ];
    }

    /**
     * Revokes current active token for the user.
     */
    public function logout(User $user): void
    {
        if ($user->currentAccessToken()) {
            $user->currentAccessToken()->delete();
        }
    }
}

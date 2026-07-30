<?php

namespace Tests\Feature;

use App\Models\FaceEncoding;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FaceEnrollmentRegistrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'mahasiswa']);
    }

    public function test_registration_fails_when_no_face_detected_and_does_not_create_any_db_records()
    {
        // Mock Python face service response for image without face
        $faceServiceUrl = config('services.face_service.url', 'http://127.0.0.1:8001');
        Http::fake([
            "{$faceServiceUrl}/encode" => Http::response([
                'success' => false,
                'error' => 'no_face_detected',
            ], 200),
        ]);

        $initialUserCount = User::count();
        $initialEncodingCount = FaceEncoding::count();
        $initialRoleUserCount = DB::table('role_user')->count();

        $payload = [
            'name' => 'Mahasiswa Test No Face',
            'email' => 'noface@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '12345678',
            'angkatan' => '2024',
            'face_image' => 'data:image/jpeg;base64,dummy_landscape_photo_without_face',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        // Assert 422 status
        $response->assertStatus(422)
            ->assertJsonPath('status', 'error')
            ->assertJsonPath('errors.error_code', 'no_face_detected');

        // Assert ZERO partial records created in DB
        $this->assertEquals($initialUserCount, User::count(), 'User count should NOT increase when face encoding fails');
        $this->assertEquals($initialEncodingCount, FaceEncoding::count(), 'FaceEncoding count should NOT increase when face encoding fails');
        $this->assertEquals($initialRoleUserCount, DB::table('role_user')->count(), 'RoleUser count should NOT increase when face encoding fails');
    }

    public function test_registration_succeeds_when_valid_face_detected()
    {
        $faceServiceUrl = config('services.face_service.url', 'http://127.0.0.1:8001');
        Http::fake([
            "{$faceServiceUrl}/encode" => Http::response([
                'success' => true,
                'encoding' => array_fill(0, 128, 0.1),
            ], 200),
        ]);

        $initialUserCount = User::count();
        $initialEncodingCount = FaceEncoding::count();

        $payload = [
            'name' => 'Mahasiswa Valid Face',
            'email' => 'validface@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'nim' => '87654321',
            'angkatan' => '2024',
            'face_image' => 'data:image/jpeg;base64,valid_face_photo',
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'success');

        $this->assertEquals($initialUserCount + 1, User::count());
        $this->assertEquals($initialEncodingCount + 1, FaceEncoding::count());
    }
}

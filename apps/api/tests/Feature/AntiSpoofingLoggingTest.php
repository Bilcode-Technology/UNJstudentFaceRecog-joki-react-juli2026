<?php

namespace Tests\Feature;

use App\Exceptions\FaceEncodingException;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\FaceEncoding;
use App\Models\Role;
use App\Models\User;
use App\Services\AttendanceService;
use App\Services\FaceRecognitionService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class AntiSpoofingLoggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_spoof_detected_logs_warning_and_returns_generic_error_message(): void
    {
        Log::spy();

        $kormatRole = Role::firstOrCreate(['name' => 'kormat']);
        $mahasiswaRole = Role::firstOrCreate(['name' => 'mahasiswa']);

        $kormat = User::factory()->create();
        $kormat->roles()->attach($kormatRole);

        $student = User::factory()->create();
        $student->roles()->attach($mahasiswaRole);

        $course = Course::create([
            'name' => 'Pemrograman Web AntiSpoof',
            'code' => 'PW901',
            'join_code' => 'SPOOF1',
            'kormat_id' => $kormat->id,
            'is_archived' => false,
        ]);

        $course->students()->attach($student->id, [
            'status' => 'approved',
            'joined_at' => now(),
        ]);

        $now = Carbon::now('Asia/Jakarta');
        $session = ClassSession::create([
            'course_id' => $course->id,
            'meeting_type' => 'online',
            'room' => null,
            'meeting_date' => $now->toDateString(),
            'start_time' => $now->copy()->subMinutes(10)->toTimeString(),
            'end_time' => $now->copy()->addHour()->toTimeString(),
        ]);

        FaceEncoding::create([
            'user_id' => $student->id,
            'encoding' => array_fill(0, 128, 0.1),
        ]);

        // Mock Python face-service returning spoof_detected
        Http::fake([
            '*' => Http::response([
                'success' => false,
                'error' => 'spoof_detected',
                'score' => 0.25,
            ], 200),
        ]);

        /** @var AttendanceService $attendanceService */
        $attendanceService = app(AttendanceService::class);

        try {
            $attendanceService->checkIn($student, $session->id, 'fake_base64', -6.194, 106.879);
            $this->fail("Expected FaceEncodingException was not thrown");
        } catch (FaceEncodingException $e) {
            $this->assertEquals("Presensi gagal, silakan coba lagi.", $e->getMessage());
            $this->assertEquals("spoof_detected", $e->getErrorCode());
            $this->assertEquals(422, $e->getCode());
        }

        // Verify Log::warning was recorded for monitoring
        Log::shouldHaveReceived('warning')
            ->once()
            ->with("Anti-spoofing trigger: Terdeteksi indikasi foto/layar HP saat check-in", \Mockery::subset([
                'user_id' => $student->id,
                'session_id' => $session->id,
                'score' => 0.25,
            ]));
    }
}

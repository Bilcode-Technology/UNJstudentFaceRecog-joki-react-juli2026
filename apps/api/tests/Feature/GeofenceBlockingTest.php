<?php

namespace Tests\Feature;

use App\Exceptions\GeofenceException;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\Course;
use App\Models\FaceEncoding;
use App\Models\Role;
use App\Models\User;
use App\Services\AttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GeofenceBlockingTest extends TestCase
{
    use RefreshDatabase;

    protected User $kormat;
    protected User $student;
    protected Course $course;

    protected function setUp(): void
    {
        parent::setUp();

        $kormatRole = Role::firstOrCreate(['name' => 'kormat']);
        $mahasiswaRole = Role::firstOrCreate(['name' => 'mahasiswa']);

        $this->kormat = User::factory()->create();
        $this->kormat->roles()->attach($kormatRole);

        $this->student = User::factory()->create();
        $this->student->roles()->attach($mahasiswaRole);

        $this->course = Course::create([
            'name' => 'Praktikum Jaringan Komputer',
            'code' => 'PJK101',
            'join_code' => 'GEO101',
            'kormat_id' => $this->kormat->id,
            'is_archived' => false,
        ]);

        $this->course->students()->attach($this->student->id, [
            'status' => 'approved',
            'joined_at' => now(),
        ]);

        FaceEncoding::create([
            'user_id' => $this->student->id,
            'encoding' => array_fill(0, 128, 0.1),
        ]);
    }

    public function test_offline_session_checkin_outside_radius_is_blocked_without_creating_db_row_or_calling_face_service(): void
    {
        Http::spy();

        $now = Carbon::now('Asia/Jakarta');
        $offlineSession = ClassSession::create([
            'course_id' => $this->course->id,
            'meeting_type' => 'offline',
            'room' => 'Gedung Kartini R.102',
            'meeting_date' => $now->toDateString(),
            'start_time' => $now->copy()->subMinutes(10)->toTimeString(),
            'end_time' => $now->copy()->addHour()->toTimeString(),
        ]);

        // Far coordinates (~2.5km away)
        $farLat = -6.210000;
        $farLng = 106.890000;

        /** @var AttendanceService $attendanceService */
        $attendanceService = app(AttendanceService::class);

        try {
            $attendanceService->checkIn($this->student, $offlineSession->id, 'fake_base64_img', $farLat, $farLng);
            $this->fail("Expected GeofenceException was not thrown for offline session outside radius");
        } catch (GeofenceException $e) {
            $this->assertEquals("Anda berada di luar radius lokasi kelas.", $e->getMessage());
            $this->assertEquals("out_of_radius", $e->getErrorCode());
            $this->assertEquals(422, $e->getCode());
        }

        // Assert 0 attendance rows in database
        $this->assertEquals(0, Attendance::where('class_session_id', $offlineSession->id)->count());

        // Assert Python face microservice was NOT called (fail fast to save compute)
        Http::assertNothingSent();
    }

    public function test_offline_session_checkin_inside_radius_proceeds_normally(): void
    {
        // Mock Python face service response for valid match
        Http::fake([
            '*' => Http::response([
                'success' => true,
                'match' => true,
                'distance' => 0.15,
            ], 200),
        ]);

        $now = Carbon::now('Asia/Jakarta');
        $offlineSession = ClassSession::create([
            'course_id' => $this->course->id,
            'meeting_type' => 'offline',
            'room' => 'Gedung Kartini R.102',
            'meeting_date' => $now->toDateString(),
            'start_time' => $now->copy()->subMinutes(10)->toTimeString(),
            'end_time' => $now->copy()->addHour()->toTimeString(),
        ]);

        // Inside 500m radius coordinates
        $insideLat = -6.195000;
        $insideLng = 106.879500;

        /** @var AttendanceService $attendanceService */
        $attendanceService = app(AttendanceService::class);

        $attendance = $attendanceService->checkIn($this->student, $offlineSession->id, 'valid_b64', $insideLat, $insideLng);

        $this->assertNotNull($attendance);
        $this->assertEquals('hadir', $attendance->status);
        $this->assertEquals(1, Attendance::where('class_session_id', $offlineSession->id)->count());
    }

    public function test_online_session_checkin_from_any_location_is_non_blocking(): void
    {
        // Mock Python face service response for valid match
        Http::fake([
            '*' => Http::response([
                'success' => true,
                'match' => true,
                'distance' => 0.15,
            ], 200),
        ]);

        $now = Carbon::now('Asia/Jakarta');
        $onlineSession = ClassSession::create([
            'course_id' => $this->course->id,
            'meeting_type' => 'online',
            'room' => null,
            'meeting_date' => $now->toDateString(),
            'start_time' => $now->copy()->subMinutes(10)->toTimeString(),
            'end_time' => $now->copy()->addHour()->toTimeString(),
        ]);

        // Far coordinates (~2.5km away) - Should NOT block online sessions!
        $farLat = -6.210000;
        $farLng = 106.890000;

        /** @var AttendanceService $attendanceService */
        $attendanceService = app(AttendanceService::class);

        $attendance = $attendanceService->checkIn($this->student, $onlineSession->id, 'valid_b64', $farLat, $farLng);

        $this->assertNotNull($attendance);
        $this->assertEquals('hadir', $attendance->status);
        $this->assertEquals($farLat, $attendance->latitude);
        $this->assertEquals($farLng, $attendance->longitude);
    }
}

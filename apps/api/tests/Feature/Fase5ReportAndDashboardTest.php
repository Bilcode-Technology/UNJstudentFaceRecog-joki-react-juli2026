<?php

namespace Tests\Feature;

use App\Models\ClassSession;
use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class Fase5ReportAndDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected User $kormat;
    protected User $otherKormat;
    protected User $student;
    protected Course $course;
    protected ClassSession $session;

    protected function setUp(): void
    {
        parent::setUp();

        $kormatRole = Role::firstOrCreate(['name' => 'kormat']);
        $studentRole = Role::firstOrCreate(['name' => 'mahasiswa']);

        // Create Users
        $this->kormat = User::factory()->create([
            'name' => 'Kormat Owner',
            'email' => 'kormat_fase5@example.com',
            'password' => Hash::make('password123'),
        ]);
        $this->kormat->roles()->attach($kormatRole->id);

        $this->otherKormat = User::factory()->create([
            'name' => 'Other Kormat',
            'email' => 'other_kormat_fase5@example.com',
            'password' => Hash::make('password123'),
        ]);
        $this->otherKormat->roles()->attach($kormatRole->id);

        $this->student = User::factory()->create([
            'name' => 'Student Fase5',
            'email' => 'student_fase5@example.com',
            'nim' => 'STU5001',
            'angkatan' => '2024',
        ]);
        $this->student->roles()->attach($studentRole->id);

        // Create Course & Enroll Student
        $this->course = Course::create([
            'name' => 'Pemrograman Lanjut',
            'code' => 'CS501',
            'join_code' => 'CS5001',
            'kormat_id' => $this->kormat->id,
            'is_archived' => false,
        ]);

        $this->course->students()->attach($this->student->id, [
            'status' => 'approved',
            'joined_at' => now(),
        ]);

        // Create Session
        $today = Carbon::now('Asia/Jakarta')->format('Y-m-d');
        $this->session = ClassSession::create([
            'course_id' => $this->course->id,
            'meeting_type' => 'offline',
            'room' => 'Lab 3',
            'meeting_date' => $today,
            'start_time' => '08:00',
            'end_time' => '10:00',
        ]);
    }

    public function test_kormat_dashboard_endpoint_returns_valid_data()
    {
        $response = $this->actingAs($this->kormat, 'sanctum')
            ->getJson('/api/dashboard/kormat');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.summary.total_active_courses', 1)
            ->assertJsonPath('data.courses.0.code', 'CS501');
    }

    public function test_mahasiswa_dashboard_endpoint_returns_valid_data()
    {
        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/dashboard/mahasiswa');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.summary.total_approved_courses', 1)
            ->assertJsonPath('data.courses.0.code', 'CS501');
    }

    public function test_kormat_can_get_course_report_json()
    {
        $response = $this->actingAs($this->kormat, 'sanctum')
            ->getJson("/api/courses/{$this->course->id}/report");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.course.code', 'CS501')
            ->assertJsonPath('data.students.0.nim', 'STU5001');
    }

    public function test_other_kormat_cannot_access_report()
    {
        $response = $this->actingAs($this->otherKormat, 'sanctum')
            ->getJson("/api/courses/{$this->course->id}/report");

        $response->assertStatus(403);
    }

    public function test_kormat_can_export_course_report_pdf()
    {
        $response = $this->actingAs($this->kormat, 'sanctum')
            ->get("/api/courses/{$this->course->id}/report/export");

        $response->assertStatus(200);
        $this->assertEquals('application/pdf', $response->headers->get('Content-Type'));
        $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
    }
}

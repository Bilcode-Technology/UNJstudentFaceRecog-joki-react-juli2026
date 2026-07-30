<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use App\Repositories\AttendanceRepository;
use App\Repositories\ClassSessionRepository;
use App\Repositories\CourseRepository;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Gate;

class ReportService
{
    protected CourseRepository $courseRepo;
    protected ClassSessionRepository $sessionRepo;
    protected AttendanceRepository $attendanceRepo;

    public function __construct(
        CourseRepository $courseRepo,
        ClassSessionRepository $sessionRepo,
        AttendanceRepository $attendanceRepo
    ) {
        $this->courseRepo = $courseRepo;
        $this->sessionRepo = $sessionRepo;
        $this->attendanceRepo = $attendanceRepo;
    }

    /**
     * Get structured attendance report data for a course (KORMAT owner only).
     */
    public function getCourseReport(User $kormat, int $courseId): array
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if ($course->kormat_id !== $kormat->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat laporan kelas ini");
        }

        // Fetch all sessions ordered chronologically (oldest to newest)
        $sessions = $this->sessionRepo->getByCourse($courseId)->sortBy(function ($s) {
            return $s->meeting_date->format('Y-m-d') . ' ' . $s->start_time;
        })->values();

        // Fetch all approved students
        $students = $course->students()
            ->wherePivot('status', 'approved')
            ->get(['users.id', 'users.name', 'users.email', 'users.nim', 'users.angkatan']);

        // Collect attendance per session using AttendanceRepository recap logic
        $sessionRecaps = [];
        foreach ($sessions as $session) {
            $recap = $this->attendanceRepo->getSessionAttendanceRecap($session);
            $sessionRecaps[$session->id] = $recap->keyBy('student_id');
        }

        // Build Matrix per student
        $studentMatrix = $students->map(function ($student) use ($sessions, $sessionRecaps) {
            $attendancesPerSession = [];
            $stats = [
                'hadir' => 0,
                'izin' => 0,
                'sakit' => 0,
                'alfa' => 0,
                'belum_presensi' => 0,
                'total_late_minutes' => 0,
            ];

            foreach ($sessions as $session) {
                $att = $sessionRecaps[$session->id]->get($student->id);
                $status = $att['status'] ?? 'belum_presensi';

                if (isset($stats[$status])) {
                    $stats[$status]++;
                } else {
                    $stats['belum_presensi']++;
                }

                if ($status === 'hadir' && !empty($att['late_minutes'])) {
                    $stats['total_late_minutes'] += (int) $att['late_minutes'];
                }

                $attendancesPerSession[$session->id] = [
                    'session_id' => $session->id,
                    'status' => $status,
                    'late_minutes' => $att['late_minutes'] ?? null,
                    'checked_in_at' => $att['checked_in_at'] ?? null,
                ];
            }

            $totalSessions = $sessions->count();
            $percentage = $totalSessions > 0 ? round(($stats['hadir'] / $totalSessions) * 100, 1) : 0;

            return [
                'student_id' => $student->id,
                'name' => $student->name,
                'nim' => $student->nim,
                'email' => $student->email,
                'angkatan' => $student->angkatan,
                'stats' => array_merge($stats, [
                    'total_sessions' => $totalSessions,
                    'attendance_percentage' => $percentage,
                ]),
                'sessions' => $attendancesPerSession,
            ];
        });

        return [
            'course' => [
                'id' => $course->id,
                'name' => $course->name,
                'code' => $course->code,
                'join_code' => $course->join_code,
                'kormat_name' => $kormat->name,
                'kormat_email' => $kormat->email,
                'generated_at' => Carbon::now('Asia/Jakarta')->format('Y-m-d H:i:s'),
            ],
            'sessions' => $sessions->map(function ($s) {
                return [
                    'id' => $s->id,
                    'meeting_type' => $s->meeting_type,
                    'room' => $s->room,
                    'meeting_date' => $s->meeting_date->format('Y-m-d'),
                    'start_time' => $s->start_time,
                    'end_time' => $s->end_time,
                ];
            }),
            'students' => $studentMatrix,
        ];
    }

    /**
     * Render and download PDF report for a course.
     */
    public function exportCourseReportPdf(User $kormat, int $courseId)
    {
        $reportData = $this->getCourseReport($kormat, $courseId);

        $pdf = Pdf::loadView('reports.course-attendance', $reportData)
            ->setPaper('a4', 'landscape');

        $filename = 'laporan-' . strtolower($reportData['course']['code']) . '-' . date('Ymd-His') . '.pdf';

        return $pdf->download($filename);
    }
}

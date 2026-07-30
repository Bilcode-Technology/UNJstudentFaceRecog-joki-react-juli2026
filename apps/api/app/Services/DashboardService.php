<?php

namespace App\Services;

use App\Models\Attendance;
use App\Models\Course;
use App\Models\User;
use App\Repositories\CourseRepository;
use Illuminate\Support\Facades\DB;

class DashboardService
{
    protected CourseRepository $courseRepo;
    protected ClassSessionService $classSessionService;

    public function __construct(CourseRepository $courseRepo, ClassSessionService $classSessionService)
    {
        $this->courseRepo = $courseRepo;
        $this->classSessionService = $classSessionService;
    }

    /**
     * Get Dashboard metrics and today's schedule for KORMAT.
     */
    public function getKormatDashboard(User $kormat): array
    {
        // Active & Archived course count
        $activeCourses = Course::where('kormat_id', $kormat->id)
            ->where('is_archived', false)
            ->withCount(['students' => function ($q) {
                $q->where('course_student.status', 'approved');
            }])
            ->get();

        $archivedCount = Course::where('kormat_id', $kormat->id)
            ->where('is_archived', true)
            ->count();

        // REUSE ClassSessionService::getTodaySessions ($kormat) from Phase 3
        $todaySessions = $this->classSessionService->getTodaySessions($kormat);

        return [
            'summary' => [
                'total_active_courses' => $activeCourses->count(),
                'total_archived_courses' => $archivedCount,
                'total_approved_students' => $activeCourses->sum('students_count'),
            ],
            'courses' => $activeCourses->map(function ($c) {
                return [
                    'id' => $c->id,
                    'name' => $c->name,
                    'code' => $c->code,
                    'join_code' => $c->join_code,
                    'approved_students_count' => $c->students_count,
                ];
            }),
            'today_sessions' => $todaySessions,
        ];
    }

    /**
     * Get Dashboard metrics, attendance statistics per course, and today's schedule for Mahasiswa.
     */
    public function getMahasiswaDashboard(User $student): array
    {
        // Enrolled courses (status = approved)
        $joinedCourses = $student->courses()
            ->wherePivot('status', 'approved')
            ->get();

        // Aggregate attendance stats per course for this student
        $attendanceStats = Attendance::select('class_sessions.course_id', 'attendances.status', DB::raw('count(*) as total'))
            ->join('class_sessions', 'attendances.class_session_id', '=', 'class_sessions.id')
            ->where('attendances.user_id', $student->id)
            ->groupBy('class_sessions.course_id', 'attendances.status')
            ->get()
            ->groupBy('course_id');

        $coursesSummary = $joinedCourses->map(function ($course) use ($attendanceStats) {
            $statsForCourse = $attendanceStats->get($course->id, collect());
            
            $hadir = $statsForCourse->firstWhere('status', 'hadir')?->total ?? 0;
            $izin = $statsForCourse->firstWhere('status', 'izin')?->total ?? 0;
            $sakit = $statsForCourse->firstWhere('status', 'sakit')?->total ?? 0;
            $alfa = $statsForCourse->firstWhere('status', 'alfa')?->total ?? 0;

            return [
                'id' => $course->id,
                'name' => $course->name,
                'code' => $course->code,
                'stats' => [
                    'hadir' => $hadir,
                    'izin' => $izin,
                    'sakit' => $sakit,
                    'alfa' => $alfa,
                    'total_recorded' => $hadir + $izin + $sakit + $alfa,
                ],
            ];
        });

        // REUSE ClassSessionService::getTodaySessions ($student) from Phase 3
        $todaySessions = $this->classSessionService->getTodaySessions($student);

        return [
            'summary' => [
                'total_approved_courses' => $joinedCourses->count(),
                'total_hadir' => $coursesSummary->sum('stats.hadir'),
                'total_izin' => $coursesSummary->sum('stats.izin'),
                'total_sakit' => $coursesSummary->sum('stats.sakit'),
                'total_alfa' => $coursesSummary->sum('stats.alfa'),
            ],
            'courses' => $coursesSummary,
            'today_sessions' => $todaySessions,
        ];
    }
}

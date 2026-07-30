<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use App\Notifications\JoinRequestStatusNotification;
use App\Notifications\NewJoinRequestNotification;
use App\Repositories\CourseRepository;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Notification;
use InvalidArgumentException;

class CourseService
{
    protected CourseRepository $courseRepo;

    public function __construct(CourseRepository $courseRepo)
    {
        $this->courseRepo = $courseRepo;
    }

    /**
     * Create a new course for KORMAT.
     */
    public function createCourse(User $user, array $data): Course
    {
        $payload = array_merge($data, [
            'kormat_id' => $user->id,
            'is_archived' => false,
        ]);

        return $this->courseRepo->create($payload);
    }

    /**
     * Get courses managed by KORMAT.
     */
    public function getManagedCourses(User $user, bool $archived = false)
    {
        return $this->courseRepo->getManagedCourses($user->id, $archived);
    }

    /**
     * Get course detail with policy check.
     */
    public function getCourseDetail(User $user, int $courseId): Course
    {
        $course = $this->courseRepo->findWithCounts($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if (!Gate::allows('view', $course)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat kelas ini");
        }

        return $course;
    }

    /**
     * Delete course (only allowed if KORMAT owner and 0 sessions exist).
     */
    public function deleteCourse(User $user, int $courseId): void
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if ($course->kormat_id !== $user->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk menghapus kelas ini");
        }

        if ($course->classSessions()->count() > 0) {
            throw new InvalidArgumentException("Kelas tidak dapat dihapus karena sudah memiliki sesi pertemuan");
        }

        $this->courseRepo->delete($course);
    }

    /**
     * Archive or unarchive course.
     */
    public function archiveCourse(User $user, int $courseId, bool $isArchived): Course
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if (!Gate::allows('update', $course)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk mengubah kelas ini");
        }

        return $this->courseRepo->updateArchive($course, $isArchived);
    }

    /**
     * Get list of students enrolled in course.
     */
    public function getCourseStudents(User $user, int $courseId, ?string $status = null)
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if (!Gate::allows('view', $course)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat daftar mahasiswa kelas ini");
        }

        return $this->courseRepo->getCourseStudents($course, $status);
    }

    /**
     * Approve single student join request.
     */
    public function approveStudent(User $user, int $courseId, int $studentId): void
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course || $course->kormat_id !== $user->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk menyetujui mahasiswa di kelas ini");
        }

        $this->courseRepo->updateStudentStatus($course, $studentId, 'approved', now());

        $student = User::find($studentId);
        if ($student) {
            $student->notify(new JoinRequestStatusNotification($course, 'approved'));
        }
    }

    /**
     * Bulk approve student join requests in DB transaction.
     */
    public function bulkApproveStudents(User $user, int $courseId, array $studentIds): void
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course || $course->kormat_id !== $user->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk menyetujui mahasiswa di kelas ini");
        }

        DB::transaction(function () use ($course, $studentIds) {
            $this->courseRepo->bulkApproveStudents($course, $studentIds);

            $students = User::whereIn('id', $studentIds)->get();
            Notification::send($students, new JoinRequestStatusNotification($course, 'approved'));
        });
    }

    /**
     * Reject single student join request.
     */
    public function rejectStudent(User $user, int $courseId, int $studentId): void
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course || $course->kormat_id !== $user->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk menolak mahasiswa di kelas ini");
        }

        $this->courseRepo->updateStudentStatus($course, $studentId, 'rejected');

        $student = User::find($studentId);
        if ($student) {
            $student->notify(new JoinRequestStatusNotification($course, 'rejected'));
        }
    }

    /**
     * Get available courses for student.
     */
    public function getAvailableCourses(User $user)
    {
        return $this->courseRepo->getAvailableCoursesForStudent($user->id);
    }

    /**
     * Get joined/pending courses for student.
     */
    public function getJoinedCourses(User $user)
    {
        return $this->courseRepo->getJoinedCoursesForStudent($user->id);
    }

    /**
     * Join course via join_code for student.
     */
    public function joinCourse(User $user, string $joinCode): Course
    {
        $course = $this->courseRepo->findByJoinCode($joinCode);

        if (!$course) {
            throw new InvalidArgumentException("Kode kelas tidak ditemukan");
        }

        if ($course->is_archived) {
            throw new InvalidArgumentException("Kelas ini telah diarsipkan dan tidak menerima pendaftaran baru");
        }

        // Check duplicate join request
        $existingRecord = $course->students()->where('user_id', $user->id)->first();
        if ($existingRecord) {
            throw new InvalidArgumentException("Anda sudah pernah mengajukan bergabung ke kelas ini");
        }

        $this->courseRepo->attachStudentPending($course, $user->id);

        if ($course->kormat) {
            $course->kormat->notify(new NewJoinRequestNotification($course, $user));
        }

        return $course;
    }
}

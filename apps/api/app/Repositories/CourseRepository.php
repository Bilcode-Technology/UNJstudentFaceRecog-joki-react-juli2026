<?php

namespace App\Repositories;

use App\Models\Course;

class CourseRepository
{
    /**
     * Create a new course record.
     */
    public function create(array $data): Course
    {
        return Course::create($data);
    }

    /**
     * Get courses managed by a specific KORMAT.
     */
    public function getManagedCourses(int $kormatId, bool $archived = false)
    {
        return Course::where('kormat_id', $kormatId)
            ->where('is_archived', $archived)
            ->withCount(['students as approved_students_count' => function ($query) {
                $query->where('status', 'approved');
            }])
            ->latest()
            ->get();
    }

    /**
     * Find a course by ID with student status counts and basic session list.
     */
    public function findWithCounts(int $id): ?Course
    {
        return Course::with(['classSessions' => function ($q) {
            $q->orderBy('meeting_date', 'desc')->orderBy('start_time', 'desc');
        }])
        ->withCount([
            'students as pending_students_count' => fn($q) => $q->where('status', 'pending'),
            'students as approved_students_count' => fn($q) => $q->where('status', 'approved'),
            'students as rejected_students_count' => fn($q) => $q->where('status', 'rejected'),
        ])
        ->find($id);
    }

    /**
     * Find raw course model by ID.
     */
    public function findById(int $id): ?Course
    {
        return Course::find($id);
    }

    /**
     * Find course by unique join code.
     */
    public function findByJoinCode(string $joinCode): ?Course
    {
        $code = strtoupper(trim($joinCode));
        return Course::where('join_code', $code)
            ->orWhere('code', $code)
            ->first();
    }

    /**
     * Get students enrolled in a course with optional status filter.
     */
    public function getCourseStudents(Course $course, ?string $status = null)
    {
        $query = $course->students();

        if (!empty($status)) {
            $query->wherePivot('status', $status);
        }

        return $query->get(['users.id', 'users.name', 'users.email', 'users.nim', 'users.angkatan']);
    }

    /**
     * Update archive status.
     */
    public function updateArchive(Course $course, bool $isArchived): Course
    {
        $course->is_archived = $isArchived;
        $course->save();
        return $course;
    }

    /**
     * Delete course.
     */
    public function delete(Course $course): bool
    {
        return $course->delete();
    }

    /**
     * Update single student status in course pivot.
     */
    public function updateStudentStatus(Course $course, int $studentId, string $status, ?string $joinedAt = null): void
    {
        $attributes = ['status' => $status];
        if ($joinedAt !== null) {
            $attributes['joined_at'] = $joinedAt;
        }

        $course->students()->updateExistingPivot($studentId, $attributes);
    }

    /**
     * Bulk approve students for a course.
     */
    public function bulkApproveStudents(Course $course, array $studentIds): void
    {
        $now = now();
        foreach ($studentIds as $studentId) {
            $course->students()->updateExistingPivot($studentId, [
                'status' => 'approved',
                'joined_at' => $now,
            ]);
        }
    }

    /**
     * Available courses for student (not joined, not archived).
     */
    public function getAvailableCoursesForStudent(int $studentId)
    {
        return Course::where('is_archived', false)
            ->whereDoesntHave('students', function ($query) use ($studentId) {
                $query->where('user_id', $studentId);
            })
            ->with('kormat:id,name,email')
            ->latest()
            ->get();
    }

    /**
     * Joined/Pending courses for student.
     */
    public function getJoinedCoursesForStudent(int $studentId)
    {
        return Course::whereHas('students', function ($query) use ($studentId) {
            $query->where('user_id', $studentId)
                ->whereIn('status', ['approved', 'pending']);
        })
        ->with(['kormat:id,name,email', 'students' => function ($query) use ($studentId) {
            $query->where('user_id', $studentId);
        }])
        ->latest()
        ->get();
    }

    /**
     * Attach student to course with pending status.
     */
    public function attachStudentPending(Course $course, int $studentId): void
    {
        $course->students()->attach($studentId, [
            'status' => 'pending',
            'joined_at' => null,
        ]);
    }
}

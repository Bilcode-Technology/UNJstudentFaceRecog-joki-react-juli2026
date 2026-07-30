<?php

namespace App\Repositories;

use App\Models\ClassSession;
use Carbon\Carbon;

class ClassSessionRepository
{
    /**
     * Create a new class session record.
     */
    public function create(array $data): ClassSession
    {
        return ClassSession::create($data);
    }

    /**
     * Get all sessions for a course ordered by date & start time descending.
     */
    public function getByCourse(int $courseId)
    {
        return ClassSession::where('course_id', $courseId)
            ->orderBy('meeting_date', 'desc')
            ->orderBy('start_time', 'desc')
            ->get();
    }

    /**
     * Find session by ID with course details.
     */
    public function findById(int $id): ?ClassSession
    {
        return ClassSession::with('course:id,name,code,kormat_id')->find($id);
    }

    /**
     * Get sessions scheduled for today for all courses managed by KORMAT in Asia/Jakarta timezone.
     */
    public function getTodaySessionsForKormat(int $kormatId)
    {
        $today = Carbon::now('Asia/Jakarta')->format('Y-m-d');

        return ClassSession::whereHas('course', function ($q) use ($kormatId) {
            $q->where('kormat_id', $kormatId);
        })
        ->where('meeting_date', $today)
        ->with('course:id,name,code')
        ->orderBy('start_time', 'asc')
        ->get();
    }

    /**
     * Get sessions scheduled for today for all courses joined & approved by student in Asia/Jakarta timezone.
     */
    public function getTodaySessionsForStudent(int $studentId)
    {
        $today = Carbon::now('Asia/Jakarta')->format('Y-m-d');

        return ClassSession::whereHas('course.students', function ($q) use ($studentId) {
            $q->where('user_id', $studentId)->where('status', 'approved');
        })
        ->where('meeting_date', $today)
        ->with('course:id,name,code')
        ->orderBy('start_time', 'asc')
        ->get();
    }
}

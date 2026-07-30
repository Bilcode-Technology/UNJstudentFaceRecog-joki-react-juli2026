<?php

namespace App\Repositories;

use App\Models\Attendance;
use App\Models\ClassSession;

class AttendanceRepository
{
    /**
     * Find attendance record for a specific session and user.
     */
    public function findBySessionAndUser(int $sessionId, int $userId): ?Attendance
    {
        return Attendance::where('class_session_id', $sessionId)
            ->where('user_id', $userId)
            ->first();
    }

    /**
     * Create a new attendance record.
     */
    public function create(array $data): Attendance
    {
        return Attendance::create($data);
    }

    /**
     * Update existing or create new attendance record (for KORMAT manual override).
     */
    public function updateOrCreate(array $attributes, array $values): Attendance
    {
        return Attendance::updateOrCreate($attributes, $values);
    }

    /**
     * Get full attendance recap for a session including all approved students.
     * Students without attendance rows are assigned status = "belum_presensi".
     */
    public function getSessionAttendanceRecap(ClassSession $session)
    {
        $approvedStudents = $session->course->students()
            ->wherePivot('status', 'approved')
            ->get(['users.id', 'users.name', 'users.email', 'users.nim', 'users.angkatan']);

        $attendances = Attendance::where('class_session_id', $session->id)
            ->get()
            ->keyBy('user_id');

        return $approvedStudents->map(function ($student) use ($attendances) {
            $att = $attendances->get($student->id);

            return [
                'student_id' => $student->id,
                'name' => $student->name,
                'email' => $student->email,
                'nim' => $student->nim,
                'angkatan' => $student->angkatan,
                'attendance_id' => $att?->id,
                'status' => $att?->status ?? 'belum_presensi',
                'late_minutes' => $att?->late_minutes,
                'checked_in_at' => $att?->checked_in_at?->format('Y-m-d H:i:s'),
                'latitude' => $att?->latitude,
                'longitude' => $att?->longitude,
                'is_manual_override' => $att?->is_manual_override ?? false,
                'overridden_by' => $att?->overridden_by,
            ];
        });
    }
}

<?php

namespace App\Services;

use App\Exceptions\FaceEncodingException;
use App\Models\Attendance;
use App\Models\ClassSession;
use App\Models\User;
use App\Repositories\AttendanceRepository;
use App\Repositories\ClassSessionRepository;
use Carbon\Carbon;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use InvalidArgumentException;

class AttendanceService
{
    protected AttendanceRepository $attendanceRepo;
    protected ClassSessionRepository $sessionRepo;
    protected FaceRecognitionService $faceService;

    public function __construct(
        AttendanceRepository $attendanceRepo,
        ClassSessionRepository $sessionRepo,
        FaceRecognitionService $faceService
    ) {
        $this->attendanceRepo = $attendanceRepo;
        $this->sessionRepo = $sessionRepo;
        $this->faceService = $faceService;
    }

    /**
     * Mahasiswa check-in via 1:1 face verification and raw lat/lng logging.
     *
     * @throws FaceEncodingException|InvalidArgumentException|AuthorizationException
     */
    public function checkIn(User $student, int $sessionId, string $base64Image, float $latitude, float $longitude): Attendance
    {
        $session = $this->sessionRepo->findById($sessionId);

        if (!$session) {
            throw new ModelNotFoundException("Sesi pertemuan tidak ditemukan");
        }

        // 1. Authorization check via AttendancePolicy
        if (!Gate::forUser($student)->allows('checkIn', $session)) {
            throw new AuthorizationException("Anda bukan mahasiswa terdaftar di kelas ini");
        }

        // 2. Prevent duplicate check-in / permission
        $existing = $this->attendanceRepo->findBySessionAndUser($sessionId, $student->id);
        if ($existing) {
            throw new InvalidArgumentException("Anda sudah tercatat untuk sesi ini.");
        }

        // 3. Time Window Validation (Asia/Jakarta)
        $now = Carbon::now('Asia/Jakarta');
        $meetingDate = $session->meeting_date->format('Y-m-d');
        $startDateTime = Carbon::createFromFormat('Y-m-d H:i:s', "{$meetingDate} {$session->start_time}", 'Asia/Jakarta');
        $endDateTime = Carbon::createFromFormat('Y-m-d H:i:s', "{$meetingDate} {$session->end_time}", 'Asia/Jakarta');

        if ($now->lt($startDateTime)) {
            throw new InvalidArgumentException("Sesi belum dimulai");
        }

        if ($now->gt($endDateTime)) {
            throw new InvalidArgumentException("Sesi sudah berakhir");
        }

        // 4. Retrieve student face encoding
        $faceEncodingRecord = $student->faceEncoding;
        if (!$faceEncodingRecord || empty($faceEncodingRecord->encoding)) {
            throw new FaceEncodingException("Presensi gagal, silakan coba lagi.", "no_encoding", 422);
        }

        // 5. Verify face via Python microservice
        $verifyResult = $this->faceService->verify($base64Image, $faceEncodingRecord->encoding);

        if (empty($verifyResult['success']) || empty($verifyResult['match'])) {
            throw new FaceEncodingException("Presensi gagal, silakan coba lagi.", "verification_failed", 422);
        }

        // 6. Calculate late minutes
        $tolerance = config('attendance.tolerance_minutes', 5);
        $minutesSinceStart = (int) $startDateTime->diffInMinutes($now, false);
        $lateMinutes = ($minutesSinceStart <= $tolerance) ? 0 : $minutesSinceStart;

        // 7. Save Attendance record in DB transaction (is_manual_override = false, raw lat/lng)
        return DB::transaction(function () use ($sessionId, $student, $lateMinutes, $latitude, $longitude) {
            return $this->attendanceRepo->create([
                'class_session_id' => $sessionId,
                'user_id' => $student->id,
                'status' => 'hadir',
                'late_minutes' => $lateMinutes,
                'checked_in_at' => now(),
                'latitude' => $latitude,
                'longitude' => $longitude,
                'is_manual_override' => false,
                'overridden_by' => null,
            ]);
        });
    }

    /**
     * Submit permission (izin / sakit) before session end_time.
     */
    public function submitPermission(User $student, int $sessionId, string $status): Attendance
    {
        if (!in_array($status, ['izin', 'sakit'])) {
            throw new InvalidArgumentException("Status izin tidak valid");
        }

        $session = $this->sessionRepo->findById($sessionId);

        if (!$session) {
            throw new ModelNotFoundException("Sesi pertemuan tidak ditemukan");
        }

        // Authorization check via AttendancePolicy
        if (!Gate::forUser($student)->allows('permission', $session)) {
            throw new AuthorizationException("Anda bukan mahasiswa terdaftar di kelas ini");
        }

        // Prevent duplicate record
        $existing = $this->attendanceRepo->findBySessionAndUser($sessionId, $student->id);
        if ($existing) {
            throw new InvalidArgumentException("Anda sudah tercatat untuk sesi ini.");
        }

        // Time window check: can submit anytime before end_time
        $now = Carbon::now('Asia/Jakarta');
        $meetingDate = $session->meeting_date->format('Y-m-d');
        $endDateTime = Carbon::createFromFormat('Y-m-d H:i:s', "{$meetingDate} {$session->end_time}", 'Asia/Jakarta');

        if ($now->gt($endDateTime)) {
            throw new InvalidArgumentException("Sesi sudah berakhir");
        }

        return $this->attendanceRepo->create([
            'class_session_id' => $sessionId,
            'user_id' => $student->id,
            'status' => $status,
            'late_minutes' => null,
            'checked_in_at' => null,
            'latitude' => null,
            'longitude' => null,
            'is_manual_override' => false,
            'overridden_by' => null,
        ]);
    }

    /**
     * Get attendance recap for a session (KORMAT owner only).
     */
    public function getSessionRecap(User $kormat, int $sessionId)
    {
        $session = $this->sessionRepo->findById($sessionId);

        if (!$session) {
            throw new ModelNotFoundException("Sesi pertemuan tidak ditemukan");
        }

        // Authorization check via AttendancePolicy
        if (!Gate::forUser($kormat)->allows('viewRecap', $session)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat rekap sesi ini");
        }

        return $this->attendanceRepo->getSessionAttendanceRecap($session);
    }

    /**
     * Override attendance status for a student manually (KORMAT owner only).
     */
    public function overrideAttendance(User $kormat, int $sessionId, int $studentId, string $status): Attendance
    {
        if (!in_array($status, ['hadir', 'izin', 'sakit', 'alfa'])) {
            throw new InvalidArgumentException("Status presensi tidak valid");
        }

        $session = $this->sessionRepo->findById($sessionId);

        if (!$session) {
            throw new ModelNotFoundException("Sesi pertemuan tidak ditemukan");
        }

        // Authorization check via AttendancePolicy
        if (!Gate::forUser($kormat)->allows('override', [$session, $studentId])) {
            throw new AuthorizationException("Anda tidak memiliki hak akses atau mahasiswa tersebut tidak terdaftar di kelas ini");
        }

        return $this->attendanceRepo->updateOrCreate(
            ['class_session_id' => $sessionId, 'user_id' => $studentId],
            [
                'status' => $status,
                'is_manual_override' => true,
                'overridden_by' => $kormat->id,
            ]
        );
    }
}

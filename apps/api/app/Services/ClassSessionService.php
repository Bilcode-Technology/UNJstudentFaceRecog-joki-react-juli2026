<?php

namespace App\Services;

use App\Models\ClassSession;
use App\Models\User;
use App\Repositories\ClassSessionRepository;
use App\Repositories\CourseRepository;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\Gate;

class ClassSessionService
{
    protected ClassSessionRepository $sessionRepo;
    protected CourseRepository $courseRepo;

    public function __construct(ClassSessionRepository $sessionRepo, CourseRepository $courseRepo)
    {
        $this->sessionRepo = $sessionRepo;
        $this->courseRepo = $courseRepo;
    }

    /**
     * Create a new class session (KORMAT owner only).
     */
    public function createSession(User $user, int $courseId, array $data): ClassSession
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if ($course->kormat_id !== $user->id) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk membuat sesi di kelas ini");
        }

        $payload = array_merge($data, [
            'course_id' => $courseId,
        ]);

        return $this->sessionRepo->create($payload);
    }

    /**
     * Get all sessions for a course (Allowed for KORMAT owner OR approved student).
     */
    public function getSessionsByCourse(User $user, int $courseId)
    {
        $course = $this->courseRepo->findById($courseId);

        if (!$course) {
            throw new ModelNotFoundException("Mata kuliah tidak ditemukan");
        }

        if (!Gate::allows('view', $course)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat sesi di kelas ini");
        }

        return $this->sessionRepo->getByCourse($courseId);
    }

    /**
     * Get single session detail (Allowed for KORMAT owner OR approved student).
     */
    public function getSessionDetail(User $user, int $sessionId): ClassSession
    {
        $session = $this->sessionRepo->findById($sessionId);

        if (!$session) {
            throw new ModelNotFoundException("Sesi pertemuan tidak ditemukan");
        }

        if (!Gate::allows('view', $session->course)) {
            throw new AuthorizationException("Anda tidak memiliki hak akses untuk melihat detail sesi ini");
        }

        return $session;
    }

    /**
     * Get today's scheduled sessions for KORMAT or Mahasiswa in Asia/Jakarta timezone.
     */
    public function getTodaySessions(User $user)
    {
        $isKormat = $user->roles()->where('name', 'kormat')->exists();

        if ($isKormat) {
            return $this->sessionRepo->getTodaySessionsForKormat($user->id);
        }

        return $this->sessionRepo->getTodaySessionsForStudent($user->id);
    }
}

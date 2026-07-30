<?php

namespace App\Policies;

use App\Models\ClassSession;
use App\Models\User;

class AttendancePolicy
{
    /**
     * Mahasiswa boleh check-in hanya jika statusnya `approved` di kelas terkait sesi tersebut.
     *
     * [AI CONTEXT: Single source of truth untuk otorisasi check-in mahasiswa.]
     */
    public function checkIn(User $user, ClassSession $session): bool
    {
        if (!$user->roles->pluck('name')->contains('mahasiswa')) {
            return false;
        }

        return $session->course->students()
            ->where('user_id', $user->id)
            ->wherePivot('status', 'approved')
            ->exists();
    }

    /**
     * Mahasiswa boleh mengajukan izin/sakit hanya jika statusnya `approved` di kelas terkait sesi tersebut.
     *
     * [AI CONTEXT: Single source of truth untuk otorisasi pengajuan izin/sakit.]
     */
    public function permission(User $user, ClassSession $session): bool
    {
        return $this->checkIn($user, $session);
    }

    /**
     * KORMAT boleh melihat rekap presensi HANYA untuk sesi dari kelas yang dia kelola sendiri.
     *
     * [AI CONTEXT: Single source of truth untuk otorisasi melihat rekap presensi.]
     */
    public function viewRecap(User $user, ClassSession $session): bool
    {
        if (!$user->roles->pluck('name')->contains('kormat')) {
            return false;
        }

        return $session->course->kormat_id === $user->id;
    }

    /**
     * KORMAT boleh meng-override status presensi mahasiswa HANYA jika:
     * - Sesi milik kelas yang dikelolanya
     * - Mahasiswa yang di-override terdaftar dengan status `approved` di kelas tersebut
     *
     * [AI CONTEXT: Single source of truth untuk otorisasi override presensi.]
     */
    public function override(User $user, ClassSession $session, int $studentId): bool
    {
        if (!$this->viewRecap($user, $session)) {
            return false;
        }

        return $session->course->students()
            ->where('user_id', $studentId)
            ->wherePivot('status', 'approved')
            ->exists();
    }
}

<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use InvalidArgumentException;

class SuperadminService
{
    /**
     * Create a new KORMAT user account.
     */
    public function createKormat(array $data): User
    {
        $kormatRole = Role::where('name', 'kormat')->firstOrFail();

        return DB::transaction(function () use ($data, $kormatRole) {
            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'is_active' => true,
            ]);

            $user->roles()->attach($kormatRole->id);

            return $user->load('roles');
        });
    }

    /**
     * Get list of all KORMAT users with course counts and active status.
     */
    public function getKormatList()
    {
        return User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })
        ->withCount('courses')
        ->latest()
        ->get();
    }

    /**
     * Get detail of a specific KORMAT user with managed courses.
     */
    public function getKormatDetail(int $id): User
    {
        $user = User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })
        ->with(['courses' => function ($query) {
            $query->withCount(['students' => function ($q) {
                $q->where('course_student.status', 'approved');
            }]);
        }])
        ->find($id);

        if (!$user) {
            throw new ModelNotFoundException("Akun KORMAT tidak ditemukan");
        }

        return $user;
    }

    /**
     * Update KORMAT name and email.
     */
    public function updateKormat(int $id, array $data): User
    {
        $user = User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })->find($id);

        if (!$user) {
            throw new ModelNotFoundException("Akun KORMAT tidak ditemukan");
        }

        $user->update([
            'name' => $data['name'],
            'email' => $data['email'],
        ]);

        return $user;
    }

    /**
     * Set KORMAT active or inactive status.
     */
    public function setKormatActive(int $id, bool $isActive): User
    {
        $user = User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })->find($id);

        if (!$user) {
            throw new ModelNotFoundException("Akun KORMAT tidak ditemukan");
        }

        $user->update([
            'is_active' => $isActive,
        ]);

        return $user;
    }

    /**
     * Reset KORMAT password manually.
     */
    public function resetKormatPassword(int $id, string $password): User
    {
        $user = User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })->find($id);

        if (!$user) {
            throw new ModelNotFoundException("Akun KORMAT tidak ditemukan");
        }

        $user->update([
            'password' => Hash::make($password),
        ]);

        return $user;
    }

    /**
     * Delete KORMAT account if 0 courses exist.
     */
    public function deleteKormat(int $id): void
    {
        $user = User::whereHas('roles', function ($query) {
            $query->where('name', 'kormat');
        })->find($id);

        if (!$user) {
            throw new ModelNotFoundException("Akun KORMAT tidak ditemukan");
        }

        if ($user->courses()->count() > 0) {
            throw new InvalidArgumentException("KORMAT tidak dapat dihapus karena telah mengelola kelas. Silakan nonaktifkan akun sebagai gantinya.");
        }

        DB::transaction(function () use ($user) {
            $user->roles()->detach();
            $user->delete();
        });
    }

    /**
     * Get read-only overview of all courses in the system.
     */
    public function getAllCourses()
    {
        return Course::with(['kormat:id,name,email'])
            ->withCount(['students' => function ($query) {
                $query->where('course_student.status', 'approved');
            }, 'classSessions'])
            ->latest()
            ->get();
    }

    /**
     * Get read-only overview of all students in the system.
     */
    public function getAllStudents()
    {
        return User::whereHas('roles', function ($query) {
            $query->where('name', 'mahasiswa');
        })
        ->withCount(['courses' => function ($query) {
            $query->where('course_student.status', 'approved');
        }])
        ->latest()
        ->get();
    }
}

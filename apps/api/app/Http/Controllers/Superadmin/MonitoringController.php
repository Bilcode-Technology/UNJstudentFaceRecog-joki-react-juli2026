<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Services\SuperadminService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;

class MonitoringController extends Controller
{
    use ApiResponse;

    protected SuperadminService $superadminService;

    public function __construct(SuperadminService $superadminService)
    {
        $this->superadminService = $superadminService;
    }

    /**
     * Get read-only overview of all courses.
     */
    public function courses(): JsonResponse
    {
        $courses = $this->superadminService->getAllCourses();
        return $this->successResponse($courses, 'Daftar seluruh kelas berhasil diambil');
    }

    /**
     * Get read-only overview of all students.
     */
    public function students(): JsonResponse
    {
        $students = $this->superadminService->getAllStudents();
        return $this->successResponse($students, 'Daftar seluruh mahasiswa berhasil diambil');
    }
}

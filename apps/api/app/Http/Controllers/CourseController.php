<?php

namespace App\Http\Controllers;

use App\Services\CourseService;
use App\Traits\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseController extends Controller
{
    use ApiResponse;

    protected CourseService $courseService;

    public function __construct(CourseService $courseService)
    {
        $this->courseService = $courseService;
    }

    /**
     * POST /api/courses - Create a new course (KORMAT).
     */
    public function create(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'code' => 'required|string|max:50|unique:courses,code',
            ], [
                'name.required' => 'Nama mata kuliah wajib diisi.',
                'code.required' => 'Kode mata kuliah wajib diisi.',
                'code.unique' => 'Kode mata kuliah sudah terdaftar.',
            ]);

            $course = $this->courseService->createCourse($request->user(), $validated);

            return $this->successResponse($course, 'Kelas berhasil dibuat', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal membuat kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses - List courses managed by KORMAT.
     */
    public function managedIndex(Request $request): JsonResponse
    {
        try {
            $archived = filter_var($request->query('archived', false), FILTER_VALIDATE_BOOLEAN);
            $courses = $this->courseService->getManagedCourses($request->user(), $archived);

            return $this->successResponse($courses, 'Daftar kelas berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil daftar kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/available - Available courses for student to join.
     */
    public function availableIndex(Request $request): JsonResponse
    {
        try {
            $courses = $this->courseService->getAvailableCourses($request->user());
            return $this->successResponse($courses, 'Daftar kelas tersedia berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil daftar kelas tersedia: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/joined - Courses joined/pending for student.
     */
    public function joinedIndex(Request $request): JsonResponse
    {
        try {
            $courses = $this->courseService->getJoinedCourses($request->user());
            return $this->successResponse($courses, 'Daftar kelas diikuti berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil daftar kelas diikuti: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/courses/join - Join a course via join_code.
     */
    public function join(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'join_code' => 'required|string|max:10',
            ]);

            $course = $this->courseService->joinCourse($request->user(), $validated['join_code']);

            return $this->successResponse($course, 'Pengajuan bergabung kelas berhasil dikirim');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengajukan join kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/{id} - View course details.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $course = $this->courseService->getCourseDetail($request->user(), $id);
            return $this->successResponse($course, 'Detail kelas berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil detail kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * DELETE /api/courses/{id} - Delete course (KORMAT).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        try {
            $this->courseService->deleteCourse($request->user(), $id);
            return $this->successResponse(null, 'Kelas berhasil dihapus');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal menghapus kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/courses/{id}/archive - Set is_archived.
     */
    public function archive(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'is_archived' => 'required|boolean',
            ]);

            $course = $this->courseService->archiveCourse($request->user(), $id, $validated['is_archived']);
            $msg = $validated['is_archived'] ? 'Kelas berhasil diarsipkan' : 'Kelas berhasil diaktifkan kembali';

            return $this->successResponse($course, $msg);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengarsipkan kelas: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/{id}/students - List students in course.
     */
    public function students(Request $request, int $id): JsonResponse
    {
        try {
            $status = $request->query('status');
            $students = $this->courseService->getCourseStudents($request->user(), $id, $status);

            return $this->successResponse($students, 'Daftar mahasiswa berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil daftar mahasiswa: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/courses/{id}/students/{student_id}/approve - Approve single student.
     */
    public function approveStudent(Request $request, int $id, int $student_id): JsonResponse
    {
        try {
            $this->courseService->approveStudent($request->user(), $id, $student_id);
            return $this->successResponse(null, 'Pengajuan bergabung mahasiswa disetujui');
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal menyetujui mahasiswa: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/courses/{id}/students/bulk-approve - Bulk approve students.
     */
    public function bulkApproveStudents(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'student_ids' => 'required|array|min:1',
                'student_ids.*' => 'integer|exists:users,id',
            ]);

            $this->courseService->bulkApproveStudents($request->user(), $id, $validated['student_ids']);

            return $this->successResponse(null, 'Seluruh pengajuan mahasiswa berhasil disetujui');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal memproses persetujuan masal: ' . $e->getMessage(), 500);
        }
    }

    /**
     * POST /api/courses/{id}/students/{student_id}/reject - Reject student.
     */
    public function rejectStudent(Request $request, int $id, int $student_id): JsonResponse
    {
        try {
            $this->courseService->rejectStudent($request->user(), $id, $student_id);
            return $this->successResponse(null, 'Pengajuan bergabung mahasiswa ditolak');
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal menolak mahasiswa: ' . $e->getMessage(), 500);
        }
    }
}

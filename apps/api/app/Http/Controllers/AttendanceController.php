<?php

namespace App\Http\Controllers;

use App\Exceptions\FaceEncodingException;
use App\Services\AttendanceService;
use App\Traits\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AttendanceController extends Controller
{
    use ApiResponse;

    protected AttendanceService $attendanceService;

    public function __construct(AttendanceService $attendanceService)
    {
        $this->attendanceService = $attendanceService;
    }

    /**
     * POST /api/sessions/{id}/attendance/check-in (Mahasiswa)
     */
    public function checkIn(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'image' => 'required|string',
                'latitude' => 'required|numeric',
                'longitude' => 'required|numeric',
            ]);

            $attendance = $this->attendanceService->checkIn(
                $request->user(),
                $id,
                $validated['image'],
                (float) $validated['latitude'],
                (float) $validated['longitude']
            );

            return $this->successResponse($attendance, 'Presensi berhasil dicatat', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (FaceEncodingException $e) {
            // Strictly returns generic message for check-in face failures per Rule #8
            return $this->errorResponse($e->getMessage(), $e->getCode() ?: 422);
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Presensi gagal, silakan coba lagi.', 500);
        }
    }

    /**
     * POST /api/sessions/{id}/attendance/permission (Mahasiswa)
     */
    public function permission(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:izin,sakit',
            ]);

            $attendance = $this->attendanceService->submitPermission(
                $request->user(),
                $id,
                $validated['status']
            );

            return $this->successResponse($attendance, 'Pengajuan izin/sakit berhasil dicatat', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengajukan izin/sakit: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/sessions/{id}/attendance (KORMAT)
     */
    public function recap(Request $request, int $id): JsonResponse
    {
        try {
            $recap = $this->attendanceService->getSessionRecap($request->user(), $id);
            return $this->successResponse($recap, 'Rekap presensi berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil rekap presensi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * PATCH /api/sessions/{id}/attendance/{student_id} (KORMAT)
     */
    public function override(Request $request, int $id, int $student_id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'status' => 'required|in:hadir,izin,sakit,alfa',
            ]);

            $attendance = $this->attendanceService->overrideAttendance(
                $request->user(),
                $id,
                $student_id,
                $validated['status']
            );

            return $this->successResponse($attendance, 'Status presensi mahasiswa berhasil diperbarui');
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (\InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal memperbarui status presensi: ' . $e->getMessage(), 500);
        }
    }
}

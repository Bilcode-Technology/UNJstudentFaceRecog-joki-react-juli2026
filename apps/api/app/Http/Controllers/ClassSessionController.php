<?php

namespace App\Http\Controllers;

use App\Services\ClassSessionService;
use App\Traits\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassSessionController extends Controller
{
    use ApiResponse;

    protected ClassSessionService $sessionService;

    public function __construct(ClassSessionService $sessionService)
    {
        $this->sessionService = $sessionService;
    }

    /**
     * POST /api/courses/{id}/sessions - Create a new class session (KORMAT owner only).
     */
    public function create(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'meeting_type' => 'required|in:online,offline',
                'room' => 'required_if:meeting_type,offline|nullable|string|max:100',
                'meeting_date' => 'required|date|after_or_equal:today',
                'start_time' => 'required|date_format:H:i',
                'end_time' => 'required|date_format:H:i|after:start_time',
            ], [
                'meeting_date.after_or_equal' => 'Tanggal pertemuan tidak boleh kurang dari tanggal sekarang.',
                'end_time.after' => 'Jam selesai tidak boleh lebih awal dari atau sama dengan jam mulai.',
                'room.required_if' => 'Ruang kelas wajib diisi untuk pertemuan luring (offline).',
            ]);

            $session = $this->sessionService->createSession($request->user(), $id, $validated);

            return $this->successResponse($session, 'Sesi pertemuan berhasil dibuat', 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal membuat sesi pertemuan: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/{id}/sessions - Shared endpoint for KORMAT owner OR approved student.
     * Middleware: auth:sanctum ONLY.
     */
    public function byCourse(Request $request, int $id): JsonResponse
    {
        try {
            $sessions = $this->sessionService->getSessionsByCourse($request->user(), $id);
            return $this->successResponse($sessions, 'Daftar sesi pertemuan berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil daftar sesi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/sessions/{id} - View single session details.
     * Middleware: auth:sanctum ONLY.
     */
    public function show(Request $request, int $id): JsonResponse
    {
        try {
            $session = $this->sessionService->getSessionDetail($request->user(), $id);
            return $this->successResponse($session, 'Detail sesi pertemuan berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil detail sesi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/sessions/today - Get today's sessions in Asia/Jakarta timezone.
     * Middleware: auth:sanctum ONLY.
     */
    public function today(Request $request): JsonResponse
    {
        try {
            $sessions = $this->sessionService->getTodaySessions($request->user());
            return $this->successResponse($sessions, 'Jadwal sesi hari ini berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil jadwal sesi hari ini: ' . $e->getMessage(), 500);
        }
    }
}

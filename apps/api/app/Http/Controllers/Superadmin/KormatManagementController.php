<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Services\SuperadminService;
use App\Traits\ApiResponse;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;

class KormatManagementController extends Controller
{
    use ApiResponse;

    protected SuperadminService $superadminService;

    public function __construct(SuperadminService $superadminService)
    {
        $this->superadminService = $superadminService;
    }

    /**
     * Get list of all KORMAT users.
     */
    public function index(): JsonResponse
    {
        $kormats = $this->superadminService->getKormatList();
        return $this->successResponse($kormats, 'Daftar KORMAT berhasil diambil');
    }

    /**
     * Create a new KORMAT account.
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email',
                'password' => 'required|string|min:8',
            ]);

            $kormat = $this->superadminService->createKormat($validated);
            return $this->successResponse($kormat, 'Akun KORMAT berhasil dibuat', 201);
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get details of a specific KORMAT account.
     */
    public function show(int $id): JsonResponse
    {
        try {
            $kormat = $this->superadminService->getKormatDetail($id);
            return $this->successResponse($kormat, 'Detail KORMAT berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Update KORMAT profile (name, email).
     */
    public function update(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users,email,' . $id,
            ]);

            $kormat = $this->superadminService->updateKormat($id, $validated);
            return $this->successResponse($kormat, 'Data KORMAT berhasil diperbarui');
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Activate or deactivate KORMAT account.
     */
    public function deactivate(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'is_active' => 'required|boolean',
            ]);

            $kormat = $this->superadminService->setKormatActive($id, $validated['is_active']);
            $statusText = $validated['is_active'] ? 'diaktifkan' : 'dinonaktifkan';
            return $this->successResponse($kormat, "Akun KORMAT berhasil {$statusText}");
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Reset KORMAT password manually.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        try {
            $validated = $request->validate([
                'password' => 'required|string|min:8|confirmed',
            ]);

            $kormat = $this->superadminService->resetKormatPassword($id, $validated['password']);
            return $this->successResponse($kormat, 'Password KORMAT berhasil diperbarui');
        } catch (ValidationException $e) {
            return $this->errorResponse('Validasi gagal', 422, $e->errors());
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Delete KORMAT account (allowed only if 0 courses managed).
     */
    public function destroy(int $id): JsonResponse
    {
        try {
            $this->superadminService->deleteKormat($id);
            return $this->successResponse(null, 'Akun KORMAT berhasil dihapus');
        } catch (InvalidArgumentException $e) {
            return $this->errorResponse($e->getMessage(), 422);
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (\Throwable $e) {
            return $this->errorResponse('Terjadi kesalahan pada server: ' . $e->getMessage(), 500);
        }
    }
}

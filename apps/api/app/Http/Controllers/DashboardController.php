<?php

namespace App\Http\Controllers;

use App\Services\DashboardService;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    use ApiResponse;

    protected DashboardService $dashboardService;

    public function __construct(DashboardService $dashboardService)
    {
        $this->dashboardService = $dashboardService;
    }

    /**
     * GET /api/dashboard/kormat (KORMAT)
     */
    public function kormat(Request $request): JsonResponse
    {
        try {
            $data = $this->dashboardService->getKormatDashboard($request->user());
            return $this->successResponse($data, 'Data dashboard KORMAT berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil dashboard KORMAT: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/dashboard/mahasiswa (Mahasiswa)
     */
    public function mahasiswa(Request $request): JsonResponse
    {
        try {
            $data = $this->dashboardService->getMahasiswaDashboard($request->user());
            return $this->successResponse($data, 'Data dashboard Mahasiswa berhasil diambil');
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil dashboard Mahasiswa: ' . $e->getMessage(), 500);
        }
    }
}

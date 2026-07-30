<?php

namespace App\Http\Controllers;

use App\Services\ReportService;
use App\Traits\ApiResponse;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    use ApiResponse;

    protected ReportService $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * GET /api/courses/{id}/report (KORMAT)
     */
    public function report(Request $request, int $id): JsonResponse
    {
        try {
            $report = $this->reportService->getCourseReport($request->user(), $id);
            return $this->successResponse($report, 'Laporan presensi berhasil diambil');
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengambil laporan presensi: ' . $e->getMessage(), 500);
        }
    }

    /**
     * GET /api/courses/{id}/report/export (KORMAT)
     */
    public function export(Request $request, int $id)
    {
        try {
            return $this->reportService->exportCourseReportPdf($request->user(), $id);
        } catch (ModelNotFoundException $e) {
            return $this->errorResponse($e->getMessage(), 404);
        } catch (AuthorizationException $e) {
            return $this->errorResponse($e->getMessage(), 403);
        } catch (\Throwable $e) {
            return $this->errorResponse('Gagal mengeksport laporan PDF: ' . $e->getMessage(), 500);
        }
    }
}

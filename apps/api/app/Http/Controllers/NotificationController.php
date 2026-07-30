<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * Get list of notifications for authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->get();

        return response()->json([
            'status' => 'success',
            'message' => 'Berhasil mengambil riwayat notifikasi',
            'data' => $notifications,
            'errors' => null,
        ], 200);
    }

    /**
     * Mark specific notification as read.
     */
    public function markAsRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->where('id', $id)
            ->first();

        if (!$notification) {
            return response()->json([
                'status' => 'error',
                'message' => 'Notifikasi tidak ditemukan atau Anda tidak memiliki hak akses',
                'data' => null,
                'errors' => [
                    'notification' => ['Akses ditolak'],
                ],
            ], 403);
        }

        $notification->markAsRead();

        return response()->json([
            'status' => 'success',
            'message' => 'Notifikasi berhasil ditandai sebagai dibaca',
            'data' => $notification,
            'errors' => null,
        ], 200);
    }
}

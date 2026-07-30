<?php

use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ClassSessionController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PushSubscriptionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\Superadmin\KormatManagementController;
use App\Http\Controllers\Superadmin\MonitoringController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Auth Routes
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});

// Authenticated Routes
Route::middleware('auth:sanctum')->group(function () {

    // --- Superadmin Specific Routes ---
    Route::middleware('role:superadmin')->prefix('superadmin')->group(function () {
        Route::prefix('kormat')->group(function () {
            Route::get('/', [KormatManagementController::class, 'index']);
            Route::post('/', [KormatManagementController::class, 'store']);
            Route::get('/{id}', [KormatManagementController::class, 'show']);
            Route::patch('/{id}', [KormatManagementController::class, 'update']);
            Route::patch('/{id}/deactivate', [KormatManagementController::class, 'deactivate']);
            Route::patch('/{id}/reset-password', [KormatManagementController::class, 'resetPassword']);
            Route::delete('/{id}', [KormatManagementController::class, 'destroy']);
        });

        Route::get('/courses', [MonitoringController::class, 'courses']);
        Route::get('/students', [MonitoringController::class, 'students']);
    });

    // --- Push Subscription & Notifications ---
    Route::post('/push/subscribe', [PushSubscriptionController::class, 'subscribe']);
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);

    // --- Mahasiswa Specific Routes ---
    Route::middleware('role:mahasiswa')->group(function () {
        Route::get('/dashboard/mahasiswa', [DashboardController::class, 'mahasiswa']);

        Route::prefix('courses')->group(function () {
            Route::get('/available', [CourseController::class, 'availableIndex']);
            Route::get('/joined', [CourseController::class, 'joinedIndex']);
            Route::post('/join', [CourseController::class, 'join']);
        });

        Route::prefix('sessions/{id}/attendance')->group(function () {
            Route::post('/check-in', [AttendanceController::class, 'checkIn']);
            Route::post('/permission', [AttendanceController::class, 'permission']);
        });
    });

    // --- KORMAT Specific Routes ---
    Route::middleware('role:kormat')->group(function () {
        Route::get('/dashboard/kormat', [DashboardController::class, 'kormat']);

        Route::prefix('courses')->group(function () {
            Route::post('/', [CourseController::class, 'create']);
            Route::get('/', [CourseController::class, 'managedIndex']);
            Route::delete('/{id}', [CourseController::class, 'destroy']);
            Route::patch('/{id}/archive', [CourseController::class, 'archive']);
            Route::get('/{id}/students', [CourseController::class, 'students']);
            Route::post('/{id}/students/{student_id}/approve', [CourseController::class, 'approveStudent']);
            Route::post('/{id}/students/bulk-approve', [CourseController::class, 'bulkApproveStudents']);
            Route::post('/{id}/students/{student_id}/reject', [CourseController::class, 'rejectStudent']);
            Route::post('/{id}/sessions', [ClassSessionController::class, 'create']);
            Route::get('/{id}/report', [ReportController::class, 'report']);
            Route::get('/{id}/report/export', [ReportController::class, 'export']);
        });

        Route::prefix('sessions/{id}/attendance')->group(function () {
            Route::get('/', [AttendanceController::class, 'recap']);
            Route::patch('/{student_id}', [AttendanceController::class, 'override']);
        });
    });

    // --- Shared Course & Session Routes (auth:sanctum ONLY) ---
    // Authorization (KORMAT owner vs approved student) is enforced in Controller/Policy layer
    Route::get('/courses/{id}', [CourseController::class, 'show']);
    Route::get('/courses/{id}/sessions', [ClassSessionController::class, 'byCourse']);
    Route::get('/sessions/today', [ClassSessionController::class, 'today']);
    Route::get('/sessions/{id}', [ClassSessionController::class, 'show']);
});

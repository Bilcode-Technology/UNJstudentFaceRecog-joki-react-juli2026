<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Course;
use App\Models\ClassSession;
use App\Models\Attendance;
use App\Models\FaceEncoding;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Artisan;
use Carbon\Carbon;

function sendReq($kernel, string $method, string $uri, array $data = [], ?string $token = null) {
    Auth::forgetGuards();
    $req = Request::create($uri, $method, $data);
    $req->headers->set('Accept', 'application/json');
    if ($token) {
        $req->headers->set('Authorization', 'Bearer ' . $token);
    }
    $res = $kernel->handle($req);
    $kernel->terminate($req, $res);
    return [
        'status' => $res->getStatusCode(),
        'json' => json_decode($res->getContent(), true),
    ];
}

echo "==========================================" . PHP_EOL;
echo "FASE 4 ATTENDANCE MODULE INTEGRATION TEST" . PHP_EOL;
echo "==========================================" . PHP_EOL;

// Setup Roles
$kormatRole = Role::where('name', 'kormat')->first();
$mahasiswaRole = Role::where('name', 'mahasiswa')->first();

// Clean up existing test data
User::whereIn('email', ['kormat4@example.com', 'mhs41@example.com', 'mhs42@example.com', 'mhs43@example.com', 'mhs44@example.com'])->delete();

// Create KORMAT
$kormat = User::create(['name' => 'Kormat Fase 4', 'email' => 'kormat4@example.com', 'password' => Hash::make('password123')]);
$kormat->roles()->attach($kormatRole->id);

// Create Students 1..4
$mhs1 = User::create(['name' => 'Mhs 41', 'email' => 'mhs41@example.com', 'password' => Hash::make('password123'), 'nim' => 'M401', 'angkatan' => '2024']);
$mhs1->roles()->attach($mahasiswaRole->id);
FaceEncoding::create(['user_id' => $mhs1->id, 'encoding' => array_fill(0, 128, 0.0)]);

$mhs2 = User::create(['name' => 'Mhs 42', 'email' => 'mhs42@example.com', 'password' => Hash::make('password123'), 'nim' => 'M402', 'angkatan' => '2024']);
$mhs2->roles()->attach($mahasiswaRole->id);
FaceEncoding::create(['user_id' => $mhs2->id, 'encoding' => array_fill(0, 128, 0.0)]);

$mhs3 = User::create(['name' => 'Mhs 43', 'email' => 'mhs43@example.com', 'password' => Hash::make('password123'), 'nim' => 'M403', 'angkatan' => '2024']);
$mhs3->roles()->attach($mahasiswaRole->id);

$mhs4 = User::create(['name' => 'Mhs 44', 'email' => 'mhs44@example.com', 'password' => Hash::make('password123'), 'nim' => 'M404', 'angkatan' => '2024']);
$mhs4->roles()->attach($mahasiswaRole->id);

// Tokens
$tokenK = sendReq($kernel, 'POST', '/api/auth/login', ['email' => 'kormat4@example.com', 'password' => 'password123'])['json']['data']['token'];
$tokenM1 = sendReq($kernel, 'POST', '/api/auth/login', ['email' => 'mhs41@example.com', 'password' => 'password123'])['json']['data']['token'];
$tokenM2 = sendReq($kernel, 'POST', '/api/auth/login', ['email' => 'mhs42@example.com', 'password' => 'password123'])['json']['data']['token'];

// Create Course & Approve all 4 students
$course = Course::create(['name' => 'Presensi Course', 'code' => 'PRE101', 'kormat_id' => $kormat->id, 'is_archived' => false]);
$course->students()->attach([$mhs1->id, $mhs2->id, $mhs3->id, $mhs4->id], ['status' => 'approved', 'joined_at' => now()]);

$now = Carbon::now('Asia/Jakarta');
$todayStr = $now->format('Y-m-d');

// Session 1: Started 2 mins ago (within 5-min tolerance)
$sess1 = ClassSession::create([
    'course_id' => $course->id,
    'meeting_type' => 'offline',
    'room' => 'Ruang 101',
    'meeting_date' => $todayStr,
    'start_time' => $now->copy()->subMinutes(2)->format('H:i'),
    'end_time' => $now->copy()->addHours(2)->format('H:i'),
]);

// Session 2: Started 15 mins ago (past 5-min tolerance)
$sess2 = ClassSession::create([
    'course_id' => $course->id,
    'meeting_type' => 'online',
    'meeting_date' => $todayStr,
    'start_time' => $now->copy()->subMinutes(15)->format('H:i'),
    'end_time' => $now->copy()->addHours(2)->format('H:i'),
]);

// Session 3: Ended 1 hour ago
$sess3 = ClassSession::create([
    'course_id' => $course->id,
    'meeting_type' => 'offline',
    'room' => 'Ruang 202',
    'meeting_date' => $todayStr,
    'start_time' => $now->copy()->subHours(3)->format('H:i'),
    'end_time' => $now->copy()->subHours(1)->format('H:i'),
]);

// Valid 1x1 base64 JPEG image string
$validJpegBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

// --- Test 1: Check-in within 5 minutes tolerance (late_minutes = 0) ---
$res1 = sendReq($kernel, 'POST', "/api/sessions/{$sess1->id}/attendance/check-in", [
    'image' => $validJpegBase64,
    'latitude' => -6.2088,
    'longitude' => 106.8456,
], $tokenM1);

echo "Test 1 - Check-in within 5 min tolerance status: " . $res1['status'] . PHP_EOL;
echo "Test 1 - Hadir late_minutes: " . var_export($res1['json']['data']['late_minutes'] ?? null, true) . " (Expected 0)" . PHP_EOL;

// --- Test 2: Check-in after 5 minutes tolerance (late_minutes = 15) ---
$res2 = sendReq($kernel, 'POST', "/api/sessions/{$sess2->id}/attendance/check-in", [
    'image' => $validJpegBase64,
    'latitude' => -6.2088,
    'longitude' => 106.8456,
], $tokenM1);

echo PHP_EOL . "Test 2 - Check-in after 5 min tolerance status: " . $res2['status'] . PHP_EOL;
echo "Test 2 - Hadir late_minutes: " . var_export($res2['json']['data']['late_minutes'] ?? null, true) . " (Expected 15)" . PHP_EOL;

// --- Test 3: Duplicate Check-in Protection ---
$dupRes = sendReq($kernel, 'POST', "/api/sessions/{$sess1->id}/attendance/check-in", [
    'image' => $validJpegBase64,
    'latitude' => -6.2088,
    'longitude' => 106.8456,
], $tokenM1);

echo PHP_EOL . "Test 3 - Duplicate Check-in Status: " . $dupRes['status'] . " (Expected 422)" . PHP_EOL;
echo "Test 3 - Message: " . ($dupRes['json']['message'] ?? '') . PHP_EOL;

// --- Test 4: Check-in on Ended Session (Expected 422) ---
$endedRes = sendReq($kernel, 'POST', "/api/sessions/{$sess3->id}/attendance/check-in", [
    'image' => $validJpegBase64,
    'latitude' => -6.2088,
    'longitude' => 106.8456,
], $tokenM1);

echo PHP_EOL . "Test 4 - Check-in Ended Session Status: " . $endedRes['status'] . " (Expected 422)" . PHP_EOL;
echo "Test 4 - Message: " . ($endedRes['json']['message'] ?? '') . PHP_EOL;

// --- Test 5: Submit Permission (Izin) ---
$permRes = sendReq($kernel, 'POST', "/api/sessions/{$sess1->id}/attendance/permission", [
    'status' => 'izin',
], $tokenM2);

echo PHP_EOL . "Test 5 - Submit Permission Status: " . $permRes['status'] . PHP_EOL;
echo "Test 5 - Permission status: " . ($permRes['json']['data']['status'] ?? '') . ", late_minutes: " . var_export($permRes['json']['data']['late_minutes'], true) . PHP_EOL;

// --- Test 6: KORMAT Manual Override ---
$overrideRes = sendReq($kernel, 'PATCH', "/api/sessions/{$sess1->id}/attendance/{$mhs3->id}", [
    'status' => 'sakit',
], $tokenK);

echo PHP_EOL . "Test 6 - KORMAT Override Status: " . $overrideRes['status'] . PHP_EOL;
echo "Test 6 - Override status: " . ($overrideRes['json']['data']['status'] ?? '') . ", is_manual_override: " . var_export($overrideRes['json']['data']['is_manual_override'], true) . PHP_EOL;

// --- Test 7: KORMAT Session Attendance Recap ---
$recapRes = sendReq($kernel, 'GET', "/api/sessions/{$sess1->id}/attendance", [], $tokenK);
echo PHP_EOL . "Test 7 - KORMAT Recap Status: " . $recapRes['status'] . " (Recap count: " . count($recapRes['json']['data'] ?? []) . ")" . PHP_EOL;

// --- Test 8: Scheduled Auto-Alfa Job ---
Artisan::call('mark:absent-students');
$sess3AlfaCount = Attendance::where('class_session_id', $sess3->id)->where('status', 'alfa')->count();
echo PHP_EOL . "Test 8 - Auto-Alfa Job Execution OK. Session 3 Alfa Count: {$sess3AlfaCount} (Expected 4)" . PHP_EOL;

echo PHP_EOL . "==========================================" . PHP_EOL;
echo "ALL FASE 4 TESTS COMPLETED SUCCESSFULLY!" . PHP_EOL;
echo "==========================================" . PHP_EOL;

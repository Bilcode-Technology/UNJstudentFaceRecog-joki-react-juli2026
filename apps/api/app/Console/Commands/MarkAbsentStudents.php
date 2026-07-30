<?php

namespace App\Console\Commands;

use App\Models\Attendance;
use App\Models\ClassSession;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;

class MarkAbsentStudents extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'mark:absent-students';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically mark students without attendance records as Alfa for ended class sessions within the last 24 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $now = Carbon::now('Asia/Jakarta');
        $lookbackStart = $now->copy()->subHours(24)->format('Y-m-d');
        $todayStr = $now->format('Y-m-d');

        // Fetch sessions whose date is within the last 24 hours
        $sessions = ClassSession::with(['course.students' => function ($q) {
            $q->wherePivot('status', 'approved');
        }])
        ->whereBetween('meeting_date', [$lookbackStart, $todayStr])
        ->get();

        $markedCount = 0;

        foreach ($sessions as $session) {
            $meetingDate = $session->meeting_date->format('Y-m-d');
            $endDateTime = Carbon::createFromFormat('Y-m-d H:i:s', "{$meetingDate} {$session->end_time}", 'Asia/Jakarta');

            // Skip sessions that have not ended yet
            if ($now->lte($endDateTime)) {
                continue;
            }

            $approvedStudents = $session->course->students;
            if ($approvedStudents->isEmpty()) {
                continue;
            }

            // Get user_ids who already have an attendance record (hadir/izin/sakit/alfa/override)
            $existingUserIds = Attendance::where('class_session_id', $session->id)
                ->pluck('user_id')
                ->toArray();

            $absentStudentIds = $approvedStudents->pluck('id')
                ->diff($existingUserIds);

            if ($absentStudentIds->isEmpty()) {
                continue;
            }

            $insertData = [];
            $currentTime = now();

            foreach ($absentStudentIds as $userId) {
                $insertData[] = [
                    'class_session_id' => $session->id,
                    'user_id' => $userId,
                    'status' => 'alfa',
                    'late_minutes' => null,
                    'checked_in_at' => null,
                    'latitude' => null,
                    'longitude' => null,
                    'is_manual_override' => false,
                    'overridden_by' => null,
                    'created_at' => $currentTime,
                    'updated_at' => $currentTime,
                ];
            }

            // [AI CONTEXT: insertOrIgnore is used as a safeguard alongside the DB-level unique constraint
            // on (class_session_id, user_id). If another process already inserted the alfa record
            // between our EXISTS check and this insert (race condition), the insert is silently skipped.]
            Attendance::insertOrIgnore($insertData);
            $markedCount += count($insertData);
        }

        $msg = "MarkAbsentStudents: Successfully marked {$markedCount} absent student(s) as Alfa.";
        $this->info($msg);
        Log::info($msg);

        return Command::SUCCESS;
    }
}

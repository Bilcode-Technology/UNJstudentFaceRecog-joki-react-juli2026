<?php

namespace App\Console\Commands;

use App\Models\ClassSession;
use App\Notifications\SessionReminderNotification;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Notification;

class SendSessionReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'session:send-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send push and database notifications for class sessions starting in the next 15 minutes.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now();
        $todayDate = $now->toDateString();
        $currentTime = $now->format('H:i:s');
        $fifteenMinutesAhead = $now->copy()->addMinutes(15)->format('H:i:s');

        $sessionsToRemind = ClassSession::with(['course.students' => function ($query) {
            $query->wherePivot('status', 'approved');
        }])
        ->where('meeting_date', $todayDate)
        ->whereTime('start_time', '>=', $currentTime)
        ->whereTime('start_time', '<=', $fifteenMinutesAhead)
        ->whereNull('reminder_sent_at')
        ->get();

        $this->info("Found {$sessionsToRemind->count()} session(s) starting within 15 minutes.");

        foreach ($sessionsToRemind as $session) {
            $approvedStudents = $session->course->students;

            if ($approvedStudents->isNotEmpty()) {
                Notification::send($approvedStudents, new SessionReminderNotification($session));
            }

            $session->update([
                'reminder_sent_at' => Carbon::now(),
            ]);

            $this->info("Reminder sent for Session ID {$session->id} ({$session->course->name}) to {$approvedStudents->count()} student(s).");
            Log::info("[SendSessionReminders] Sent reminder for Session ID {$session->id} to {$approvedStudents->count()} students.");
        }

        return Command::SUCCESS;
    }
}

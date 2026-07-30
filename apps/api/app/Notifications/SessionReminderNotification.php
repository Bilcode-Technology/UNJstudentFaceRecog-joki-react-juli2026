<?php

namespace App\Notifications;

use App\Models\ClassSession;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class SessionReminderNotification extends Notification
{
    use Queueable;

    public ClassSession $classSession;

    public function __construct(ClassSession $classSession)
    {
        $this->classSession = $classSession;
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    public function toDatabase($notifiable): array
    {
        $courseName = $this->classSession->course->name ?? 'Mata Kuliah';
        $location = $this->classSession->meeting_type === 'offline'
            ? "di ruang {$this->classSession->room}"
            : "secara online";

        return [
            'title' => 'Pengingat Sesi Pertemuan',
            'message' => "Sesi kelas {$courseName} akan dimulai dalam 15 menit ({$this->classSession->start_time}) {$location}.",
            'course_id' => $this->classSession->course_id,
            'course_name' => $courseName,
            'session_id' => $this->classSession->id,
            'start_time' => $this->classSession->start_time,
            'room' => $this->classSession->room,
            'meeting_type' => $this->classSession->meeting_type,
            'action_url' => "/mahasiswa/courses/{$this->classSession->course_id}",
        ];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        $courseName = $this->classSession->course->name ?? 'Mata Kuliah';

        return (new WebPushMessage)
            ->title('⏰ Pengingat Sesi Pertemuan')
            ->icon('/favicon.ico')
            ->body("Sesi '{$courseName}' akan segera dimulai jam {$this->classSession->start_time}.")
            ->data(['url' => "/mahasiswa/courses/{$this->classSession->course_id}"]);
    }
}

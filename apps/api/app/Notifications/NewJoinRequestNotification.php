<?php

namespace App\Notifications;

use App\Models\Course;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class NewJoinRequestNotification extends Notification
{
    use Queueable;

    public Course $course;
    public User $student;

    public function __construct(Course $course, User $student)
    {
        $this->course = $course;
        $this->student = $student;
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'title' => 'Pengajuan Join Kelas Baru',
            'message' => "Mahasiswa {$this->student->name} ({$this->student->nim}) mengajukan bergabung ke kelas '{$this->course->name}'.",
            'course_id' => $this->course->id,
            'course_name' => $this->course->name,
            'student_id' => $this->student->id,
            'student_name' => $this->student->name,
            'student_nim' => $this->student->nim,
            'action_url' => "/kormat/courses/{$this->course->id}",
        ];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        return (new WebPushMessage)
            ->title('📩 Pengajuan Join Kelas Baru')
            ->icon('/favicon.ico')
            ->body("Mahasiswa {$this->student->name} ingin bergabung ke kelas '{$this->course->name}'.")
            ->data(['url' => "/kormat/courses/{$this->course->id}"]);
    }
}

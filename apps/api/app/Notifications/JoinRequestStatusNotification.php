<?php

namespace App\Notifications;

use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class JoinRequestStatusNotification extends Notification
{
    use Queueable;

    public Course $course;
    public string $status;

    public function __construct(Course $course, string $status)
    {
        $this->course = $course;
        $this->status = $status;
    }

    public function via($notifiable): array
    {
        return ['database', WebPushChannel::class];
    }

    public function toDatabase($notifiable): array
    {
        $statusText = $this->status === 'approved' ? 'disetujui' : 'ditolak';

        return [
            'title' => "Pengajuan Join Kelas {$statusText}",
            'message' => "Pengajuan Anda untuk bergabung di kelas '{$this->course->name}' ({$this->course->code}) telah {$statusText}.",
            'course_id' => $this->course->id,
            'course_name' => $this->course->name,
            'status' => $this->status,
            'action_url' => '/mahasiswa/courses',
        ];
    }

    public function toWebPush($notifiable, $notification): WebPushMessage
    {
        $statusText = $this->status === 'approved' ? 'disetujui 🎓' : 'ditolak ❌';

        return (new WebPushMessage)
            ->title("Pengajuan Join Kelas {$statusText}")
            ->icon('/favicon.ico')
            ->body("Pengajuan Anda untuk kelas '{$this->course->name}' telah {$statusText}.")
            ->data(['url' => '/mahasiswa/courses']);
    }
}

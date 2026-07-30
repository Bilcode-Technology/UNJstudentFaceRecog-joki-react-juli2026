<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule Auto-Alfa job every 10 minutes to process ended class sessions
Schedule::command('mark:absent-students')->everyTenMinutes();

// Schedule Session Reminder job every 5 minutes to remind students of upcoming sessions
Schedule::command('session:send-reminders')->everyFiveMinutes();


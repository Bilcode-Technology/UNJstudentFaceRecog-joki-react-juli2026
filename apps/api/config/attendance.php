<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Fixed Attendance Tolerance Minutes
    |--------------------------------------------------------------------------
    |
    | Non-negotiable system-wide fixed tolerance threshold in minutes.
    | Check-ins within the first 5 minutes of session start are marked Hadir
    | with late_minutes = 0.
    |
    */

    'tolerance_minutes' => env('ATTENDANCE_TOLERANCE_MINUTES', 5),
];

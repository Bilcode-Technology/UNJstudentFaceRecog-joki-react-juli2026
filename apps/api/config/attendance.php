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

    /*
    |--------------------------------------------------------------------------
    | Geofencing Campus Center & Radius Configuration
    |--------------------------------------------------------------------------
    |
    | Global geofence center coordinates and radius threshold for offline sessions.
    | Default center points to UNJ Campus (Rawamangun, Jakarta).
    |
    */
    'geofence' => [
        'center_lat' => (float) env('GEOFENCE_CENTER_LAT', -6.194229667565236),
        'center_lng' => (float) env('GEOFENCE_CENTER_LNG', 106.87905999303226),
        'radius_meters' => (int) env('GEOFENCE_RADIUS_METERS', 500),
    ],
];

<?php

namespace App\Services;

use App\Models\ClassSession;

class GeofenceService
{
    /**
     * Get center coordinates for session (Extensible per-session / per-building in the future).
     */
    public function getCenterFor(ClassSession $session): array
    {
        return [
            'lat' => (float) config('attendance.geofence.center_lat', -6.194229667565236),
            'lng' => (float) config('attendance.geofence.center_lng', 106.87905999303226),
        ];
    }

    /**
     * Get radius threshold in meters for session (Extensible per-session / per-building in the future).
     */
    public function getRadiusFor(ClassSession $session): int
    {
        return (int) config('attendance.geofence.radius_meters', 500);
    }

    /**
     * Calculate Haversine distance between 2 geographical coordinates in meters.
     */
    public function calculateDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadius = 6371000; // Mean Earth radius in meters

        $latFrom = deg2rad($lat1);
        $lngFrom = deg2rad($lng1);
        $latTo = deg2rad($lat2);
        $lngTo = deg2rad($lng2);

        $latDelta = $latTo - $latFrom;
        $lngDelta = $lngTo - $lngFrom;

        $angle = 2 * asin(sqrt(
            pow(sin($latDelta / 2), 2) +
            cos($latFrom) * cos($latTo) * pow(sin($lngDelta / 2), 2)
        ));

        return $angle * $earthRadius;
    }

    /**
     * Checks if given lat/lng coordinates are within max radius of session geofence center.
     */
    public function isWithinRadius(float $lat, float $lng, ClassSession $session): bool
    {
        $center = $this->getCenterFor($session);
        $maxRadius = $this->getRadiusFor($session);

        $distance = $this->calculateDistance($lat, $lng, $center['lat'], $center['lng']);

        return $distance <= $maxRadius;
    }
}

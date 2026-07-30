<?php

namespace Tests\Unit;

use App\Models\ClassSession;
use App\Services\GeofenceService;
use Tests\TestCase;

class GeofenceServiceTest extends TestCase
{
    protected GeofenceService $geofenceService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->geofenceService = new GeofenceService();
    }

    public function test_calculate_distance_haversine_returns_accurate_distance_in_meters(): void
    {
        // UNJ Rawamangun Center (-6.194229667565236, 106.87905999303226)
        $centerLat = -6.194229667565236;
        $centerLng = 106.87905999303226;

        // Point ~100m south
        $nearLat = -6.195129;
        $nearLng = 106.879060;
        $nearDistance = $this->geofenceService->calculateDistance($centerLat, $centerLng, $nearLat, $nearLng);

        $this->assertGreaterThan(90, $nearDistance);
        $this->assertLessThan(110, $nearDistance);

        // Point ~2.5km away in Manggarai/Jatinegara
        $farLat = -6.210000;
        $farLng = 106.890000;
        $farDistance = $this->geofenceService->calculateDistance($centerLat, $centerLng, $farLat, $farLng);

        $this->assertGreaterThan(2000, $farDistance);
    }

    public function test_is_within_radius_returns_true_for_nearby_coordinates_and_false_for_far_coordinates(): void
    {
        $dummySession = new ClassSession(['meeting_type' => 'offline']);

        // Point inside 500m radius
        $insideLat = -6.195000;
        $insideLng = 106.879500;
        $this->assertTrue($this->geofenceService->isWithinRadius($insideLat, $insideLng, $dummySession));

        // Point outside 500m radius (2.5km away)
        $outsideLat = -6.210000;
        $outsideLng = 106.890000;
        $this->assertFalse($this->geofenceService->isWithinRadius($outsideLat, $outsideLng, $dummySession));
    }
}

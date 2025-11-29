-- ============================================================================
-- DIAGNOSE: Why No Buses Appear
-- ============================================================================
-- This will help identify which condition is failing
-- ============================================================================

-- Check 1: Do any buses have drivers?
SELECT 
  'Check 1: Buses with drivers' as diagnostic,
  COUNT(*) as total_buses,
  COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as buses_with_drivers,
  COUNT(CASE WHEN driver_id IS NULL THEN 1 END) as buses_without_drivers
FROM buses;

-- Check 2: What's the status of buses with drivers?
SELECT 
  'Check 2: Bus status breakdown' as diagnostic,
  status,
  COUNT(*) as count,
  COUNT(CASE WHEN driver_id IS NOT NULL THEN 1 END) as with_driver,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as with_coordinates
FROM buses
WHERE driver_id IS NOT NULL
GROUP BY status;

-- Check 3: Do buses have coordinates?
SELECT 
  'Check 3: Coordinate status' as diagnostic,
  bus_number,
  driver_id IS NOT NULL as has_driver,
  status,
  latitude IS NOT NULL as has_latitude,
  longitude IS NOT NULL as has_longitude,
  latitude,
  longitude,
  last_location_update
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY updated_at DESC;

-- Check 4: Check all buses (regardless of driver)
SELECT 
  'Check 4: All buses status' as diagnostic,
  bus_number,
  driver_id,
  status,
  latitude,
  longitude,
  tracking_status,
  last_location_update,
  updated_at
FROM buses
ORDER BY updated_at DESC;

-- Check 5: Detailed breakdown of why buses won't appear
SELECT 
  'Check 5: Why buses won\'t appear' as diagnostic,
  bus_number,
  CASE WHEN driver_id IS NULL THEN '❌ No driver' ELSE '✅ Has driver' END as driver_status,
  CASE WHEN status != 'active' THEN '❌ Status: ' || status ELSE '✅ Status: active' END as status_check,
  CASE WHEN latitude IS NULL THEN '❌ No latitude' 
       WHEN longitude IS NULL THEN '❌ No longitude'
       WHEN latitude = 0 AND longitude = 0 THEN '❌ Null island (0,0)'
       ELSE '✅ Has coordinates' END as coordinate_status,
  latitude,
  longitude,
  CASE WHEN last_location_update IS NULL THEN '❌ Never updated'
       WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 >= 10 THEN '❌ Stale (>10 min)'
       ELSE '✅ Recent update' END as update_status,
  last_location_update,
  CASE 
    WHEN driver_id IS NULL THEN 'No driver'
    WHEN status != 'active' THEN 'Wrong status'
    WHEN latitude IS NULL OR longitude IS NULL THEN 'Missing coordinates'
    WHEN last_location_update IS NULL THEN 'Never updated'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 >= 10 THEN 'Stale location'
    ELSE '✅ SHOULD APPEAR'
  END as why_not_showing
FROM buses
WHERE driver_id IS NOT NULL OR status = 'active'
ORDER BY updated_at DESC;


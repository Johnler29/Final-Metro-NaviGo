-- ============================================================================
-- VERIFY: Coordinates Are Working
-- ============================================================================
-- Run this to verify everything is working correctly
-- ============================================================================

-- Check 1: Are coordinates valid and updating?
SELECT 
  '✅ Check 1: Coordinate Status' as check_type,
  bus_number,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ NULL coordinates'
    WHEN latitude = 0 AND longitude = 0 THEN '❌ Null island (GPS error)'
    WHEN latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 THEN '✅ Valid coordinates'
    ELSE '❌ Invalid range'
  END as coordinate_status,
  latitude,
  longitude,
  speed,
  last_location_update,
  EXTRACT(EPOCH FROM (NOW() - last_location_update))::INTEGER as seconds_ago
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY last_location_update DESC;

-- Check 2: Should this bus appear on map?
SELECT 
  '✅ Check 2: Map Visibility' as check_type,
  bus_number,
  driver_id IS NOT NULL as has_driver,
  status = 'active' as is_active,
  latitude IS NOT NULL AND longitude IS NOT NULL as has_coordinates,
  last_location_update IS NOT NULL AND 
    EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10 as has_recent_update,
  CASE 
    WHEN driver_id IS NULL THEN '❌ No driver - WON''T appear'
    WHEN status != 'active' THEN '❌ Not active - WON''T appear'
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ No coordinates - WON''T appear'
    WHEN last_location_update IS NULL THEN '❌ Never updated - WON''T appear'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 >= 10 
    THEN '❌ Stale location (>10 min) - WON''T appear'
    ELSE '✅ SHOULD APPEAR ON MAP'
  END as map_status
FROM buses
WHERE driver_id IS NOT NULL;

-- Check 3: Real-time update frequency
SELECT 
  '✅ Check 3: Update Frequency' as check_type,
  bus_number,
  last_location_update,
  EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 as minutes_ago,
  CASE 
    WHEN last_location_update IS NULL THEN '❌ Never updated'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update)) < 30 THEN '✅ Very frequent (every < 30 sec)'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update)) < 60 THEN '✅ Frequent (every < 1 min)'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update)) < 120 THEN '✅ Regular (every < 2 min)'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 5 THEN '✅ Recent (< 5 min)'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10 THEN '⚠️ Getting stale (5-10 min)'
    ELSE '❌ Too old (> 10 min)'
  END as update_frequency
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY last_location_update DESC;

-- Check 4: Watch coordinates change (run this and refresh every 5 seconds)
SELECT 
  '✅ Check 4: Real-Time Updates' as check_type,
  bus_number,
  latitude,
  longitude,
  speed,
  tracking_status,
  EXTRACT(EPOCH FROM (NOW() - last_location_update))::INTEGER as seconds_ago,
  'Refresh every 5 seconds to see updates' as instruction
FROM buses
WHERE driver_id IS NOT NULL
  AND status = 'active'
  AND latitude IS NOT NULL
  AND longitude IS NOT NULL
ORDER BY last_location_update DESC
LIMIT 3;


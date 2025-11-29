-- ============================================================================
-- QUICK TEST: Verify NULL Coordinates Fix is Working
-- ============================================================================
-- Run this script to quickly verify the fix is working
-- ============================================================================

-- Test 1: Check function exists
SELECT 
  '✅ Function exists' as test,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL - Function not found!'
  END as result
FROM information_schema.routines 
WHERE routine_name = 'update_bus_location_simple';

-- Test 2: Get a test bus ID
SELECT 
  '📍 Test Bus Selected' as test,
  id::text as bus_id,
  bus_number,
  latitude,
  longitude,
  last_location_update
FROM buses 
WHERE driver_id IS NOT NULL 
LIMIT 1;

-- Test 3: Health check - Count problematic updates
-- (Recent timestamp but NULL coordinates = the bug we fixed)
SELECT 
  '🔍 Health Check' as test,
  COUNT(*) as total_buses_with_drivers,
  COUNT(CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN 1 END) as buses_with_coordinates,
  COUNT(CASE WHEN latitude IS NULL OR longitude IS NULL THEN 1 END) as buses_without_coordinates,
  COUNT(CASE 
    WHEN last_location_update IS NOT NULL 
    AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 5 
    AND (latitude IS NULL OR longitude IS NULL) 
    THEN 1 
  END) as problematic_updates,
  CASE 
    WHEN COUNT(CASE 
          WHEN last_location_update IS NOT NULL 
          AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 5 
          AND (latitude IS NULL OR longitude IS NULL) 
          THEN 1 
        END) = 0 
    THEN '✅ PASS - No problematic updates found!'
    ELSE '❌ FAIL - Found buses with recent timestamps but NULL coordinates!'
  END as result
FROM buses
WHERE driver_id IS NOT NULL;

-- Test 4: Show all buses with drivers
SELECT 
  '🚌 All Buses Status' as test,
  bus_number,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ No Coordinates'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 5 THEN '✅ Active (< 5 min)'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 30 THEN '⚠️ Stale (5-30 min)'
    WHEN last_location_update IS NULL THEN '❓ Never Updated'
    ELSE '🔴 Very Old (> 30 min)'
  END as status,
  latitude,
  longitude,
  last_location_update,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_location_update))/60, 2) as minutes_ago
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY last_location_update DESC NULLS LAST;

-- ============================================================================
-- MANUAL TESTS (Uncomment to run)
-- ============================================================================

-- Test A: Try updating with NULL coordinates (should REJECT)
/*
SELECT update_bus_location_simple(
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
  NULL,  -- Invalid
  NULL,  -- Invalid
  10.0,
  25.0
);
-- Expected: {"success": false, "error_code": "INVALID_COORDINATES"}
*/

-- Test B: Try updating with valid coordinates (should ACCEPT)
/*
SELECT update_bus_location_simple(
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
  14.5995,  -- Valid latitude
  120.9842, -- Valid longitude
  10.0,
  25.0
);
-- Expected: {"success": true, "message": "Location updated successfully", ...}
*/


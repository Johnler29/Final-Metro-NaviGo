-- ============================================================================
-- DIAGNOSTIC: Why are coordinates NULL?
-- ============================================================================
-- Run these queries to diagnose why latitude/longitude aren't being saved
-- ============================================================================

-- 1. Check if the fix function exists and has validation
SELECT 
  '1. Function Check' as diagnostic_step,
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%v_coordinates_valid%' 
      AND routine_definition LIKE '%p_latitude IS NOT NULL%'
    THEN '✅ FIX APPLIED - Has validation'
    ELSE '❌ FIX MISSING - No validation found'
  END as fix_status
FROM information_schema.routines 
WHERE routine_name = 'update_bus_location_simple';

-- 2. Check what's in the database right now
SELECT 
  '2. Current Database State' as diagnostic_step,
  bus_number,
  latitude,
  longitude,
  speed,
  tracking_status,
  last_location_update,
  EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 as minutes_ago,
  CASE 
    WHEN latitude IS NULL AND last_location_update IS NOT NULL 
      AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10
    THEN '⚠️ PROBLEM: Recent timestamp but NULL coordinates!'
    WHEN latitude IS NOT NULL 
    THEN '✅ Has coordinates'
    ELSE '⏳ Waiting for GPS'
  END as status
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY last_location_update DESC NULLS LAST;

-- 3. Check if there are other functions that might be updating
SELECT 
  '3. Other Update Functions' as diagnostic_step,
  routine_name,
  routine_type,
  LEFT(routine_definition, 200) as preview
FROM information_schema.routines 
WHERE routine_definition LIKE '%UPDATE buses%'
  AND routine_name != 'update_bus_location_simple'
ORDER BY routine_name;

-- 4. Check for triggers on buses table
SELECT 
  '4. Triggers on buses table' as diagnostic_step,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'buses';

-- 5. Test: Try updating with NULL coordinates (should reject)
SELECT 
  '5. Test NULL Rejection' as diagnostic_step,
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1) as test_bus_id,
  'Run the function call below to test' as instruction;

-- Uncomment to test:
/*
SELECT update_bus_location_simple(
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
  NULL,
  NULL,
  10.0,
  25.0
);
-- Expected: {"success": false, "error_code": "INVALID_COORDINATES"}
*/

-- 6. Test: Try updating with valid coordinates (should accept)
SELECT 
  '6. Test Valid Coordinates' as diagnostic_step,
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1) as test_bus_id,
  'Run the function call below to test' as instruction;

-- Uncomment to test:
/*
SELECT update_bus_location_simple(
  (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
  14.5995,  -- Valid latitude
  120.9842, -- Valid longitude
  10.0,
  25.0
);
-- Expected: {"success": true, ...}
*/


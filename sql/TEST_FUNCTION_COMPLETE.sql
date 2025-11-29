-- ============================================================================
-- COMPLETE FUNCTION TEST
-- ============================================================================
-- Test the function with both valid and invalid coordinates to verify it works
-- ============================================================================

-- Step 1: Get a test bus ID
SELECT 
  'Step 1: Get Test Bus' as step,
  id,
  bus_number,
  latitude,
  longitude,
  last_location_update
FROM buses 
WHERE driver_id IS NOT NULL 
LIMIT 1;

-- Step 2: Test with VALID coordinates (should SUCCEED)
-- Replace 'YOUR_BUS_ID' with the actual UUID from Step 1
SELECT 
  'Step 2: Test Valid Coordinates' as step,
  update_bus_location_simple(
    (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
    14.5995,   -- Valid latitude (Manila area)
    120.9842,  -- Valid longitude (Manila area)
    10.0,      -- accuracy (ignored but accepted)
    25.0       -- speed (km/h)
  ) as result;

-- Step 3: Verify coordinates were saved
SELECT 
  'Step 3: Verify Coordinates Saved' as step,
  bus_number,
  latitude,
  longitude,
  speed,
  last_location_update,
  CASE 
    WHEN latitude = 14.5995 AND longitude = 120.9842 
    THEN '✅ SUCCESS - Coordinates saved correctly!'
    WHEN latitude IS NULL OR longitude IS NULL
    THEN '❌ FAILED - Coordinates are still NULL'
    ELSE '⚠️ WARNING - Coordinates changed or different values'
  END as status
FROM buses 
WHERE driver_id IS NOT NULL 
ORDER BY last_location_update DESC 
LIMIT 1;

-- Step 4: Test with NULL coordinates (should REJECT)
SELECT 
  'Step 4: Test NULL Coordinates (should reject)' as step,
  update_bus_location_simple(
    (SELECT id FROM buses WHERE driver_id IS NOT NULL LIMIT 1),
    NULL,      -- Invalid latitude
    NULL,      -- Invalid longitude
    10.0,
    25.0
  ) as result;

-- Step 5: Verify NULL coordinates were NOT saved (last_location_update shouldn't change)
SELECT 
  'Step 5: Verify NULL Rejection' as step,
  bus_number,
  latitude,
  longitude,
  last_location_update,
  CASE 
    WHEN latitude IS NOT NULL AND longitude IS NOT NULL
    THEN '✅ SUCCESS - NULL coordinates were correctly rejected, old coordinates preserved'
    ELSE '❌ FAILED - Coordinates were cleared or NULL update was accepted'
  END as status
FROM buses 
WHERE driver_id IS NOT NULL 
ORDER BY last_location_update DESC 
LIMIT 1;


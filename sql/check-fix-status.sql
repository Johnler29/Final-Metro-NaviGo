-- ============================================================================
-- CHECK: Is the fix applied?
-- ============================================================================

-- 1. Check if function exists and has coordinate validation
SELECT 
  routine_name,
  CASE 
    WHEN routine_definition LIKE '%v_coordinates_valid%' 
      AND routine_definition LIKE '%p_latitude IS NOT NULL%'
    THEN '✅ FIX IS APPLIED - Function has coordinate validation'
    ELSE '❌ FIX NOT APPLIED - Function missing validation logic'
  END as fix_status,
  LEFT(routine_definition, 500) as function_preview
FROM information_schema.routines 
WHERE routine_name = 'update_bus_location_simple';

-- 2. Check for the problematic pattern (recent timestamp + NULL coordinates)
SELECT 
  '⚠️ Problem Found' as issue,
  COUNT(*) as count,
  'Buses with recent updates but NULL coordinates' as description
FROM buses
WHERE driver_id IS NOT NULL
  AND last_location_update IS NOT NULL
  AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10  -- Last 10 minutes
  AND (latitude IS NULL OR longitude IS NULL);

-- 3. Show the problematic buses
SELECT 
  bus_number,
  latitude,
  longitude,
  last_location_update,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_location_update))/60, 2) as minutes_ago,
  '⚠️ Has recent timestamp but NULL coordinates!' as issue
FROM buses
WHERE driver_id IS NOT NULL
  AND last_location_update IS NOT NULL
  AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10
  AND (latitude IS NULL OR longitude IS NULL);


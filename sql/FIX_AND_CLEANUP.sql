-- ============================================================================
-- COMPLETE FIX AND CLEANUP SCRIPT
-- ============================================================================
-- Run this entire script to:
-- 1. Apply the fix (if not already applied)
-- 2. Clean up existing stale data
-- 3. Verify everything is working
-- ============================================================================

-- ============================================================================
-- STEP 1: Apply the Fix
-- ============================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_bus_location_simple(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) CASCADE;

-- Create fixed function that validates coordinates before updating
CREATE FUNCTION update_bus_location_simple(
  p_bus_id UUID,
  p_latitude DECIMAL(10, 8),
  p_longitude DECIMAL(11, 8),
  p_accuracy DECIMAL(5, 2) DEFAULT NULL,
  p_speed_kmh DECIMAL(5, 2) DEFAULT NULL
)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bus_exists BOOLEAN;
  v_coordinates_valid BOOLEAN;
BEGIN
  -- Check if bus exists
  SELECT EXISTS(SELECT 1 FROM buses WHERE id = p_bus_id) INTO v_bus_exists;
  
  IF NOT v_bus_exists THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Bus not found',
      'bus_id', p_bus_id
    );
  END IF;

  -- Validate coordinates: both must be non-NULL and within valid ranges
  v_coordinates_valid := (
    p_latitude IS NOT NULL 
    AND p_longitude IS NOT NULL
    AND p_latitude BETWEEN -90 AND 90
    AND p_longitude BETWEEN -180 AND 180
  );

  -- Only update location fields if coordinates are valid
  IF v_coordinates_valid THEN
    -- Update bus location with all fields
    -- NOTE: buses table doesn't have an 'accuracy' column, so we skip it
    UPDATE buses SET
      latitude = p_latitude,
      longitude = p_longitude,
      speed = p_speed_kmh,
      tracking_status = CASE 
        WHEN p_speed_kmh > 0 THEN 'moving'
        WHEN p_speed_kmh = 0 THEN 'stopped'
        ELSE tracking_status
      END,
      last_location_update = NOW(),  -- Only update timestamp when coordinates are valid
      updated_at = NOW()
    WHERE id = p_bus_id;
    
    -- Return success response
    RETURN json_build_object(
      'success', true,
      'message', 'Location updated successfully',
      'bus_id', p_bus_id,
      'latitude', p_latitude,
      'longitude', p_longitude,
      'timestamp', NOW()
    );
  ELSE
    -- Reject update when coordinates are invalid
    RETURN json_build_object(
      'success', false,
      'message', 'Invalid coordinates: latitude and longitude must be valid numbers',
      'bus_id', p_bus_id,
      'latitude_received', p_latitude,
      'longitude_received', p_longitude,
      'error_code', 'INVALID_COORDINATES'
    );
  END IF;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION update_bus_location_simple(UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO anon, authenticated;

-- ============================================================================
-- STEP 2: Clean Up Existing Stale Data
-- ============================================================================

-- Clear invalid timestamps for buses with NULL coordinates
-- These timestamps are meaningless without coordinates
UPDATE buses
SET last_location_update = NULL
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
  AND last_location_update IS NOT NULL;

-- ============================================================================
-- STEP 3: Verify the Fix
-- ============================================================================

-- Check function has validation
SELECT 
  'Function Status' as check_type,
  CASE 
    WHEN routine_definition LIKE '%v_coordinates_valid%' 
      AND routine_definition LIKE '%p_latitude IS NOT NULL%'
    THEN '✅ FIX APPLIED - Function has coordinate validation'
    ELSE '❌ FIX FAILED - Function missing validation'
  END as status
FROM information_schema.routines 
WHERE routine_name = 'update_bus_location_simple';

-- Check for problematic updates (should be 0 after cleanup)
SELECT 
  'Data Status' as check_type,
  COUNT(*) as problematic_buses,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ NO PROBLEMATIC DATA - All clear!'
    ELSE '⚠️ Found buses with recent timestamps but NULL coordinates'
  END as status
FROM buses
WHERE driver_id IS NOT NULL
  AND last_location_update IS NOT NULL
  AND EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 10
  AND (latitude IS NULL OR longitude IS NULL);

-- Show current bus status
SELECT 
  'Current Bus Status' as check_type,
  bus_number,
  CASE 
    WHEN latitude IS NULL OR longitude IS NULL THEN '❌ No Coordinates'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 < 5 THEN '✅ Active (< 5 min)'
    WHEN last_location_update IS NULL THEN '⏳ Waiting for Update'
    ELSE '⚠️ Stale'
  END as status,
  latitude,
  longitude,
  last_location_update,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_location_update))/60, 2) as minutes_ago
FROM buses
WHERE driver_id IS NOT NULL
ORDER BY last_location_update DESC NULLS LAST;


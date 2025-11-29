-- ============================================================================
-- FIX: NULL Coordinates Issue
-- ============================================================================
-- Problem: last_location_update is being updated even when latitude/longitude are NULL
-- Solution: Only update location and timestamp when coordinates are valid (not NULL)
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
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify function exists:
-- SELECT routine_name, routine_type 
-- FROM information_schema.routines 
-- WHERE routine_name = 'update_bus_location_simple';

-- Test with valid coordinates (should succeed):
-- SELECT update_bus_location_simple(
--   (SELECT id FROM buses WHERE bus_number = 'B001' LIMIT 1),
--   14.5995,
--   120.9842,
--   10.0,
--   25.0
-- );

-- Test with NULL coordinates (should reject and not update last_location_update):
-- SELECT update_bus_location_simple(
--   (SELECT id FROM buses WHERE bus_number = 'B001' LIMIT 1),
--   NULL,
--   NULL,
--   10.0,
--   25.0
-- );

-- Check current bus locations:
-- SELECT 
--   bus_number,
--   latitude,
--   longitude,
--   last_location_update,
--   EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 as minutes_ago
-- FROM buses
-- WHERE driver_id IS NOT NULL;


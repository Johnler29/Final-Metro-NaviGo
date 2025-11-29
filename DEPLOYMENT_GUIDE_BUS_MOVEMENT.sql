-- 🚌 BUS MOVEMENT FIX - DEPLOYMENT SCRIPT
-- This script creates the missing update_bus_location_simple RPC function
-- Copy and paste this into your Supabase SQL editor

-- ============================================================================
-- DIAGNOSTIC: Check for existing functions with this name
-- ============================================================================

-- First, see all versions of this function:
SELECT 
  routine_name,
  routine_type,
  data_type as return_type,
  string_agg(parameter_name || ' ' || udt_name, ', ') as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p ON r.routine_name = p.routine_name
WHERE routine_name = 'update_bus_location_simple'
GROUP BY routine_name, routine_type, data_type;

-- ============================================================================
-- CLEANUP: Drop ALL existing versions of this function
-- ============================================================================

-- Drop ALL versions (without specifying parameters)
DROP FUNCTION IF EXISTS update_bus_location_simple CASCADE;

-- ============================================================================
-- CREATE: update_bus_location_simple() RPC Function
-- ============================================================================

-- Create the new simplified location update function with JSON response
-- FIX: Validates coordinates before updating to prevent NULL coordinate issues
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
    -- Update bus location with automatic status determination
    UPDATE buses SET
      latitude = p_latitude,
      longitude = p_longitude,
      accuracy = p_accuracy,
      speed = p_speed_kmh,
      tracking_status = CASE 
        WHEN p_speed_kmh > 0 THEN 'moving'
        WHEN p_speed_kmh = 0 THEN 'stopped'
        ELSE tracking_status
      END,
      last_location_update = NOW(),  -- Only update timestamp when coordinates are valid
      updated_at = NOW()
    WHERE id = p_bus_id;
    
    -- Return success response with metadata
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

-- ============================================================================
-- GRANT PERMISSIONS: Allow authenticated and anonymous users to call function
-- ============================================================================
GRANT EXECUTE ON FUNCTION update_bus_location_simple TO anon, authenticated;

-- ============================================================================
-- VERIFY: Test that function was created successfully
-- ============================================================================

-- Query to verify function exists:
-- SELECT routine_name FROM information_schema.routines 
-- WHERE routine_name = 'update_bus_location_simple';

-- Test function call (use a valid bus UUID):
-- SELECT update_bus_location_simple(
--   '550e8400-e29b-41d4-a716-446655440000'::uuid,
--   14.5995,
--   120.9842,
--   10.0,
--   25.0
-- );

-- ============================================================================
-- EXPECTED RESULT:
-- {
--   "success": true,
--   "message": "Location updated successfully",
--   "bus_id": "550e8400-e29b-41d4-a716-446655440000",
--   "latitude": 14.5995,
--   "longitude": 120.9842,
--   "timestamp": "2025-10-18T15:30:45.123456+00:00"
-- }
-- ============================================================================

-- ============================================================================
-- TESTING CHECKLIST
-- ============================================================================
/*
After running this script:

1. ✅ Verify function exists:
   SELECT EXISTS (
     SELECT 1 FROM information_schema.routines 
     WHERE routine_name = 'update_bus_location_simple'
   );
   -- Should return: true

2. ✅ Test with sample bus ID:
   -- First, get a valid bus ID:
   SELECT id, bus_number FROM buses LIMIT 1;
   
   -- Then test the function:
   SELECT update_bus_location_simple(
     'YOUR_BUS_ID'::uuid,
     14.5995,
     120.9842,
     10.0,
     25.0
   );

3. ✅ Verify bus location was updated:
   SELECT id, bus_number, latitude, longitude, speed, tracking_status, last_location_update
   FROM buses
   WHERE id = 'YOUR_BUS_ID'::uuid;

4. ✅ Start driver app and test location tracking:
   - Login as driver
   - Toggle "On Duty"
   - Check DevTools Console for location updates
   - Verify passenger map shows bus movement

5. ✅ Monitor database for continuous updates:
   -- Run in SQL editor to watch updates:
   SELECT latitude, longitude, speed, last_location_update
   FROM buses
   WHERE driver_id IS NOT NULL
   ORDER BY last_location_update DESC
   LIMIT 1;
*/

-- ============================================================================
-- TROUBLESHOOTING
-- ============================================================================

/*
If function is not found after creating:
1. Clear Supabase connection cache (reload the page)
2. Try calling the function with full schema: public.update_bus_location_simple()
3. Check function permissions were granted

If location updates are still not working:
1. Verify location permissions in the driver app
2. Check that GPS is enabled on device
3. Monitor browser console for error messages
4. Verify bus record exists and has an associated driver
5. Check Supabase real-time subscriptions are active

If you see "Function not found" errors:
- The DROP FUNCTION IF EXISTS in this script should have cleaned up any old version
- Make sure you're using the exact function name: update_bus_location_simple
- Verify you're calling it via supabase.rpc(), not as a table query
*/

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

/*
This RPC function is called by:
- screens/DriverHomeScreen.js (line 194)
- screens/DriverMapScreen.js (line 213)
- lib/supabase.js (line 816)

Parameters:
- p_bus_id: UUID of the bus to update
- p_latitude: GPS latitude coordinate
- p_longitude: GPS longitude coordinate
- p_accuracy: GPS accuracy in meters (optional, default NULL)
- p_speed_kmh: Speed in kilometers per hour (optional, default NULL)

Returns:
- JSON object with success status and update details

Updates Fields:
- latitude
- longitude
- accuracy
- speed
- tracking_status (auto-determined by speed)
- last_location_update (timestamp)
- updated_at (timestamp)

Security:
- ✅ Validates bus exists before updating
- ✅ Uses parameterized queries (SQL injection safe)
- ✅ Grants execute to anon and authenticated users
- ✅ Updates audit timestamp
- ✅ Automatic status determination prevents invalid states
*/

-- ============================================================================
-- QUICK CHECK: See What's Actually in the Database
-- ============================================================================
-- This will show you exactly what's wrong
-- ============================================================================

-- Simple check - show all buses
SELECT 
  bus_number,
  driver_id IS NOT NULL as has_driver,
  status,
  latitude,
  longitude,
  last_location_update
FROM buses
ORDER BY updated_at DESC;


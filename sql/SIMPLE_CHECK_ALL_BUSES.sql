-- ============================================================================
-- SIMPLE CHECK: See All Buses and Why They're Not Showing
-- ============================================================================
-- Run this to see exactly what's in the database
-- ============================================================================

-- Show all buses with their status
SELECT 
  bus_number,
  driver_id,
  status,
  latitude,
  longitude,
  last_location_update,
  updated_at,
  CASE 
    WHEN driver_id IS NULL THEN '❌ No driver assigned'
    WHEN status != 'active' THEN '❌ Status: ' || status || ' (not active)'
    WHEN latitude IS NULL THEN '❌ Missing latitude'
    WHEN longitude IS NULL THEN '❌ Missing longitude'
    WHEN latitude = 0 AND longitude = 0 THEN '❌ Null island (0,0)'
    WHEN last_location_update IS NULL THEN '❌ Never updated'
    WHEN EXTRACT(EPOCH FROM (NOW() - last_location_update))/60 >= 10 THEN '❌ Stale (>10 min old)'
    ELSE '✅ SHOULD APPEAR ON MAP'
  END as why_not_showing
FROM buses
ORDER BY updated_at DESC;


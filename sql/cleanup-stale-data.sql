-- ============================================================================
-- CLEANUP: Clear invalid timestamps for buses with NULL coordinates
-- ============================================================================
-- These timestamps are invalid because they don't have coordinates.
-- After the fix is applied, only valid coordinates will set timestamps.
-- ============================================================================

-- First, see what will be cleaned up
SELECT 
  bus_number,
  latitude,
  longitude,
  last_location_update,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_location_update))/60, 2) as minutes_ago,
  'Will clear this invalid timestamp' as action
FROM buses
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
  AND last_location_update IS NOT NULL;

-- Now clear the invalid timestamps
-- This is safe - these timestamps are meaningless without coordinates
UPDATE buses
SET last_location_update = NULL
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
  AND last_location_update IS NOT NULL;

-- Verify cleanup
SELECT 
  bus_number,
  latitude,
  longitude,
  last_location_update,
  CASE 
    WHEN last_location_update IS NULL THEN '✅ Timestamp cleared - ready for valid updates'
    ELSE '❌ Still has timestamp'
  END as status
FROM buses
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);


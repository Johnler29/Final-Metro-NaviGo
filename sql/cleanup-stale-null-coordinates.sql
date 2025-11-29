-- ============================================================================
-- CLEANUP: Reset stale NULL coordinate timestamps
-- ============================================================================
-- This script clears the last_location_update timestamp for buses that have
-- NULL coordinates. This is safe because these timestamps are invalid anyway.
-- After the fix is applied, new updates will only set timestamps when coordinates are valid.
-- ============================================================================

-- Show what will be reset (dry run)
SELECT 
  bus_number,
  latitude,
  longitude,
  last_location_update,
  ROUND(EXTRACT(EPOCH FROM (NOW() - last_location_update))/60, 2) as minutes_ago,
  'Will be reset to NULL' as action
FROM buses
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
  AND last_location_update IS NOT NULL;

-- ============================================================================
-- UNCOMMENT THE BELOW TO ACTUALLY RESET THE TIMESTAMPS
-- ============================================================================
/*
-- Reset last_location_update for buses with NULL coordinates
-- This is safe because invalid timestamps should not exist anyway
UPDATE buses
SET last_location_update = NULL
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL)
  AND last_location_update IS NOT NULL;

-- Verify the cleanup
SELECT 
  bus_number,
  latitude,
  longitude,
  last_location_update,
  CASE 
    WHEN last_location_update IS NULL THEN '✅ Timestamp cleared'
    ELSE '❌ Still has timestamp'
  END as status
FROM buses
WHERE driver_id IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);
*/


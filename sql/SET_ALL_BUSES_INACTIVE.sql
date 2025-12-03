-- Set ALL buses to inactive
-- Run this to set every bus offline

-- ============================================
-- STEP 1: Set all buses to inactive
-- ============================================
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE status = 'active';

-- ============================================
-- STEP 2: Verify it worked
-- ============================================
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_buses,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_buses,
  COUNT(*) AS total_buses
FROM buses;

-- ============================================
-- STEP 3: See all buses and their status
-- ============================================
SELECT 
  id,
  name AS bus_name,
  status AS bus_status,
  driver_id,
  tracking_status,
  updated_at AS last_updated
FROM buses
ORDER BY status, updated_at DESC;

-- ============================================
-- OPTIONAL: Also set all drivers to inactive
-- ============================================
-- Uncomment this if you also want to set all drivers to inactive

/*
UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE status = 'active';

-- Verify drivers
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_drivers,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_drivers,
  COUNT(*) AS total_drivers
FROM drivers;
*/


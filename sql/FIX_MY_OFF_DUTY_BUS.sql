-- FIX: Manually set your bus to inactive when you're off duty
-- Run this to find and fix your specific bus

-- ============================================
-- STEP 1: Find all active buses with their drivers
-- ============================================
-- This shows you which bus is yours
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.email AS driver_email,
  d.status AS driver_status,
  b.updated_at AS bus_last_update,
  d.updated_at AS driver_last_update,
  'Currently active - should be inactive if driver is off duty' AS note
FROM buses b
INNER JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active'
ORDER BY b.updated_at DESC;

-- ============================================
-- STEP 2: Fix a specific bus (replace BUS_ID and DRIVER_ID)
-- ============================================
-- Copy the bus_id and driver_id from Step 1, then run this:

/*
-- Replace these IDs with your actual bus and driver IDs from Step 1
-- Example: 'e3f89870-22c4-4fdb-a9a2-4864d1adb55a'

-- Fix the bus
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE id = 'YOUR_BUS_ID_HERE'
RETURNING id, name, status, driver_id, updated_at;

-- Fix the driver
UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE id = 'YOUR_DRIVER_ID_HERE'
RETURNING id, name, status, updated_at;
*/

-- ============================================
-- STEP 3: Fix ALL buses that should be inactive
-- ============================================
-- This will set all active buses to inactive (use carefully!)
-- Only run this if you want to set ALL buses offline

/*
-- Set all buses to inactive
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE status = 'active'
RETURNING id, name, status, driver_id, updated_at;

-- Set all drivers to inactive
UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE status = 'active'
RETURNING id, name, status, updated_at;
*/

-- ============================================
-- STEP 4: Verify the fix worked
-- ============================================
-- After running the fix, check if buses are now inactive
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN b.status = 'inactive' AND b.driver_id IS NULL THEN '✅ Correctly inactive'
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN '✅ Correctly active'
    ELSE '⚠️ Needs attention'
  END AS status_check
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.updated_at DESC;

-- ============================================
-- QUICK FIX: Set all active buses to inactive right now
-- ============================================
-- If you want to quickly set everything offline, run this:

UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE status = 'active';

-- Then verify
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_buses,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_buses,
  COUNT(*) AS total_buses
FROM buses;


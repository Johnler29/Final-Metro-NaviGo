-- FIX: Set the 3 currently active buses to inactive
-- Run this to fix the buses that are showing as active but shouldn't be

-- ============================================
-- STEP 1: See which buses need to be fixed
-- ============================================
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS current_bus_status,
  d.name AS driver_name,
  d.status AS current_driver_status,
  'Needs to be set to inactive' AS action_needed
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active';

-- ============================================
-- STEP 2: Set all active buses to inactive
-- ============================================
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE status = 'active'
RETURNING id, name, status, driver_id, updated_at;

-- ============================================
-- STEP 3: Verify the fix worked
-- ============================================
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  d.name AS driver_name,
  d.status AS driver_status,
  CASE 
    WHEN b.status = 'active' AND d.status = 'active' THEN '✅ ACTIVE (visible)'
    WHEN b.status = 'inactive' OR d.status = 'inactive' THEN '🚫 INACTIVE (hidden)'
    ELSE '❓ Check manually'
  END AS current_state
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.status DESC, b.updated_at DESC;

-- ============================================
-- STEP 4: Final count check
-- ============================================
SELECT 
  COUNT(*) FILTER (WHERE status = 'active') AS active_buses,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive_buses,
  COUNT(*) AS total_buses
FROM buses;


-- Monitor Bus Status Changes
-- Use this to track when buses go offline/online and driver status changes
-- Run these queries in Supabase SQL Editor to monitor the database

-- ============================================
-- 1. CURRENT BUS STATUS OVERVIEW
-- ============================================
-- Shows all buses with their current status, driver, and last update time
SELECT 
  b.id,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.tracking_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.latitude,
  b.longitude,
  b.last_location_update,
  b.updated_at,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL THEN '✅ Active with Driver'
    WHEN b.status = 'active' AND b.driver_id IS NULL THEN '⚠️ Active but No Driver'
    WHEN b.status = 'inactive' THEN '🚫 Inactive'
    ELSE '❓ Unknown'
  END AS status_indicator,
  EXTRACT(EPOCH FROM (NOW() - b.last_location_update)) / 60 AS minutes_since_last_update
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY 
  CASE b.status 
    WHEN 'active' THEN 1 
    WHEN 'inactive' THEN 2 
    ELSE 3 
  END,
  b.updated_at DESC;

-- ============================================
-- 2. ACTIVE BUSES WITH DRIVERS (Should appear on map)
-- ============================================
-- Only shows buses that should be visible to users
SELECT 
  b.id,
  b.name AS bus_name,
  b.bus_number,
  b.status,
  b.tracking_status,
  d.name AS driver_name,
  d.status AS driver_status,
  b.latitude,
  b.longitude,
  b.last_location_update,
  CASE 
    WHEN b.latitude IS NULL OR b.longitude IS NULL THEN '⚠️ No Coordinates'
    WHEN b.last_location_update IS NULL THEN '⚠️ No Location Update'
    WHEN b.last_location_update < NOW() - INTERVAL '10 minutes' THEN '⚠️ Stale Location (>10 min)'
    ELSE '✅ Live'
  END AS location_status
FROM buses b
INNER JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active' 
  AND b.driver_id IS NOT NULL
  AND d.status = 'active'
ORDER BY b.last_location_update DESC NULLS LAST;

-- ============================================
-- 3. INACTIVE BUSES (Should NOT appear on map)
-- ============================================
-- Shows buses that should be hidden from users
SELECT 
  b.id,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS last_status_change,
  CASE 
    WHEN b.status = 'inactive' AND b.driver_id IS NULL THEN '✅ Correctly Inactive (No Driver)'
    WHEN b.status = 'inactive' AND b.driver_id IS NOT NULL THEN '⚠️ Inactive but Still Has Driver'
    WHEN b.status = 'active' AND b.driver_id IS NULL THEN '⚠️ Active but No Driver'
    WHEN b.driver_id IS NOT NULL AND d.status = 'inactive' THEN '⚠️ Bus Active but Driver Inactive'
    ELSE '❓ Check Manually'
  END AS issue_status
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'inactive' 
   OR b.driver_id IS NULL
   OR (d.status IS NOT NULL AND d.status = 'inactive')
ORDER BY b.updated_at DESC;

-- ============================================
-- 4. RECENT STATUS CHANGES (Last 24 hours)
-- ============================================
-- Track when buses changed status (requires audit log or you can check updated_at)
SELECT 
  b.id,
  b.name AS bus_name,
  b.status AS current_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS last_change_time,
  EXTRACT(EPOCH FROM (NOW() - b.updated_at)) / 60 AS minutes_ago,
  CASE 
    WHEN b.updated_at > NOW() - INTERVAL '5 minutes' THEN '🟢 Very Recent'
    WHEN b.updated_at > NOW() - INTERVAL '30 minutes' THEN '🟡 Recent'
    WHEN b.updated_at > NOW() - INTERVAL '24 hours' THEN '🟠 Today'
    ELSE '🔴 Old'
  END AS change_recency
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY b.updated_at DESC;

-- ============================================
-- 5. BUSES WITH STALE LOCATIONS
-- ============================================
-- Find buses that haven't updated location in a while (potential issues)
SELECT 
  b.id,
  b.name AS bus_name,
  b.status,
  b.driver_id,
  d.name AS driver_name,
  b.last_location_update,
  EXTRACT(EPOCH FROM (NOW() - b.last_location_update)) / 60 AS minutes_since_update,
  CASE 
    WHEN b.last_location_update IS NULL THEN '❌ Never Updated'
    WHEN b.last_location_update < NOW() - INTERVAL '30 minutes' THEN '🔴 Very Stale (>30 min)'
    WHEN b.last_location_update < NOW() - INTERVAL '10 minutes' THEN '🟠 Stale (>10 min)'
    ELSE '✅ Recent'
  END AS staleness
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active'
  AND (
    b.last_location_update IS NULL 
    OR b.last_location_update < NOW() - INTERVAL '10 minutes'
  )
ORDER BY b.last_location_update DESC NULLS LAST;

-- ============================================
-- 6. REAL-TIME MONITORING QUERY (Run repeatedly)
-- ============================================
-- Use this query and refresh it every few seconds to see live changes
-- Best used in Supabase Dashboard or a monitoring tool
SELECT 
  NOW() AS check_time,
  COUNT(*) FILTER (WHERE b.status = 'active' AND b.driver_id IS NOT NULL) AS active_buses_with_driver,
  COUNT(*) FILTER (WHERE b.status = 'inactive') AS inactive_buses,
  COUNT(*) FILTER (WHERE b.status = 'active' AND b.driver_id IS NULL) AS active_buses_no_driver,
  COUNT(*) FILTER (WHERE b.status = 'active' AND b.driver_id IS NOT NULL AND b.last_location_update > NOW() - INTERVAL '10 minutes') AS buses_with_recent_location,
  COUNT(*) FILTER (WHERE b.status = 'active' AND b.driver_id IS NOT NULL AND (b.last_location_update IS NULL OR b.last_location_update < NOW() - INTERVAL '10 minutes')) AS buses_with_stale_location
FROM buses b;

-- ============================================
-- 7. DRIVER-BUS ASSIGNMENT STATUS
-- ============================================
-- Check if drivers are properly assigned/unassigned
SELECT 
  d.id AS driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id AS bus_driver_id,
  CASE 
    WHEN d.status = 'active' AND b.id IS NOT NULL AND b.status = 'active' AND b.driver_id = d.id THEN '✅ Correctly Assigned'
    WHEN d.status = 'inactive' AND b.id IS NULL THEN '✅ Correctly Unassigned'
    WHEN d.status = 'inactive' AND b.id IS NOT NULL THEN '⚠️ Driver Inactive but Still Assigned to Bus'
    WHEN d.status = 'active' AND b.id IS NULL THEN 'ℹ️ Driver Active but No Bus Assigned'
    WHEN d.status = 'active' AND b.id IS NOT NULL AND b.driver_id != d.id THEN '⚠️ Driver Active but Bus Assigned to Different Driver'
    ELSE '❓ Check Manually'
  END AS assignment_status
FROM drivers d
LEFT JOIN buses b ON b.driver_id = d.id
WHERE d.status IN ('active', 'inactive')
ORDER BY d.status, d.updated_at DESC;

-- ============================================
-- 8. QUICK HEALTH CHECK
-- ============================================
-- One query to see if everything is working correctly
SELECT 
  'Total Buses' AS metric,
  COUNT(*)::text AS value,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '⚠️'
  END AS status
FROM buses
UNION ALL
SELECT 
  'Active Buses with Drivers' AS metric,
  COUNT(*)::text AS value,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '⚠️'
  END AS status
FROM buses b
INNER JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active' AND d.status = 'active'
UNION ALL
SELECT 
  'Inactive Buses' AS metric,
  COUNT(*)::text AS value,
  CASE 
    WHEN COUNT(*) = 0 THEN '⚠️'
    ELSE '✅'
  END AS status
FROM buses
WHERE status = 'inactive'
UNION ALL
SELECT 
  'Buses with Recent Location Updates' AS metric,
  COUNT(*)::text AS value,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅'
    ELSE '⚠️'
  END AS status
FROM buses
WHERE last_location_update > NOW() - INTERVAL '10 minutes'
UNION ALL
SELECT 
  'Orphaned Buses (Active but No Driver)' AS metric,
  COUNT(*)::text AS value,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅'
    ELSE '⚠️'
  END AS status
FROM buses
WHERE status = 'active' AND driver_id IS NULL;

-- ============================================
-- 9. TEST: Simulate Driver Going Off Duty
-- ============================================
-- Use this to manually test the off-duty flow
-- Replace 'YOUR_BUS_ID' and 'YOUR_DRIVER_ID' with actual IDs

/*
-- Step 1: Check current state
SELECT id, name, status, driver_id FROM buses WHERE id = 'YOUR_BUS_ID';
SELECT id, name, status FROM drivers WHERE id = 'YOUR_DRIVER_ID';

-- Step 2: Simulate driver going off duty (what the app does)
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW(),
  last_location_update = NOW()
WHERE id = 'YOUR_BUS_ID';

UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE id = 'YOUR_DRIVER_ID';

-- Step 3: Verify the change
SELECT id, name, status, driver_id, updated_at FROM buses WHERE id = 'YOUR_BUS_ID';
SELECT id, name, status, updated_at FROM drivers WHERE id = 'YOUR_DRIVER_ID';

-- Step 4: Check if bus appears in inactive list (query #3)
*/

-- ============================================
-- 10. MONITORING DASHBOARD VIEW (Create this view for easy monitoring)
-- ============================================
CREATE OR REPLACE VIEW bus_status_monitor AS
SELECT 
  b.id AS bus_id,
  b.name AS bus_name,
  b.bus_number,
  b.status AS bus_status,
  b.tracking_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.latitude,
  b.longitude,
  b.last_location_update,
  b.updated_at AS last_status_change,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN 'visible'
    ELSE 'hidden'
  END AS map_visibility,
  CASE 
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' 
         AND b.last_location_update > NOW() - INTERVAL '10 minutes' THEN 'live'
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' 
         AND (b.last_location_update IS NULL OR b.last_location_update < NOW() - INTERVAL '10 minutes') THEN 'stale'
    ELSE 'offline'
  END AS location_status,
  EXTRACT(EPOCH FROM (NOW() - COALESCE(b.last_location_update, b.updated_at))) / 60 AS minutes_since_update
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id;

-- Query the view easily:
-- SELECT * FROM bus_status_monitor WHERE map_visibility = 'visible' ORDER BY last_location_update DESC;
-- SELECT * FROM bus_status_monitor WHERE map_visibility = 'hidden' ORDER BY last_status_change DESC;


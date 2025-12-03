-- TEST: Verify the off-duty flow works correctly
-- Use this to test if status updates are working

-- ============================================
-- BEFORE TEST: Check current state
-- ============================================
-- Run this BEFORE you go off duty to see the "before" state
SELECT 
  'BEFORE OFF DUTY' AS test_phase,
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS bus_updated,
  d.updated_at AS driver_updated
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active'
ORDER BY b.updated_at DESC;

-- ============================================
-- AFTER TEST: Check if status changed
-- ============================================
-- Run this AFTER you go off duty in the app to see if it worked
SELECT 
  'AFTER OFF DUTY' AS test_phase,
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS bus_updated,
  d.updated_at AS driver_updated,
  CASE 
    WHEN b.status = 'inactive' AND b.driver_id IS NULL THEN '✅ SUCCESS - Bus correctly set to inactive'
    WHEN b.status = 'inactive' AND b.driver_id IS NOT NULL THEN '⚠️ Bus inactive but still has driver_id'
    WHEN b.status = 'active' AND d.status = 'inactive' THEN '⚠️ PROBLEM - Bus still active but driver is inactive'
    WHEN b.status = 'active' AND d.status = 'active' THEN '❌ FAILED - Nothing changed, still active'
    ELSE '❓ Unknown state'
  END AS test_result
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.id IN (
  -- Replace with your bus ID, or remove this WHERE clause to check all buses
  SELECT id FROM buses WHERE status = 'active' OR status = 'inactive'
)
ORDER BY b.updated_at DESC;

-- ============================================
-- MONITOR REAL-TIME: Watch for changes
-- ============================================
-- Run this query repeatedly (every 5 seconds) while testing
-- It will show you when status changes happen
SELECT 
  NOW() AS check_time,
  b.id AS bus_id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  EXTRACT(EPOCH FROM (NOW() - b.updated_at)) AS seconds_since_bus_update,
  EXTRACT(EPOCH FROM (NOW() - d.updated_at)) AS seconds_since_driver_update
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active' OR (b.status = 'inactive' AND b.updated_at > NOW() - INTERVAL '5 minutes')
ORDER BY b.updated_at DESC;

-- ============================================
-- EXPECTED BEHAVIOR
-- ============================================
/*
When you go OFF DUTY, you should see:

1. Driver status changes: 'active' → 'inactive'
2. Bus status changes: 'active' → 'inactive'  
3. Bus driver_id changes: 'some-uuid' → NULL
4. Bus tracking_status changes: 'moving' or 'stopped' → 'stopped'
5. Both updated_at timestamps update to current time

If any of these don't happen, there's a problem with:
- The app code (update not being called)
- RLS policies (blocking the update)
- Database permissions (user can't update)
- Network issues (update not reaching database)
*/

-- ============================================
-- CHECK FOR ERRORS: See if updates are being blocked
-- ============================================
-- Check if RLS is blocking updates
SELECT 
  tablename,
  policyname,
  cmd AS command,
  roles
FROM pg_policies
WHERE tablename IN ('buses', 'drivers')
  AND cmd = 'UPDATE'
ORDER BY tablename, policyname;

-- Check if you have permission to update
SELECT 
  grantee,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name IN ('buses', 'drivers')
  AND privilege_type = 'UPDATE'
  AND grantee IN ('authenticated', 'anon', 'postgres');



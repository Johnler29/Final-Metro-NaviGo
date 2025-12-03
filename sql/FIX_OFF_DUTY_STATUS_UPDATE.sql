-- FIX: Ensure off-duty status updates work correctly
-- This script checks and fixes common issues preventing status updates

-- ============================================
-- STEP 1: Check current problematic buses
-- ============================================
-- Find buses that are active but should be inactive
SELECT 
  b.id,
  b.name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  'Needs fix' AS action
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
WHERE b.status = 'active' 
  AND (d.status = 'inactive' OR b.driver_id IS NULL OR d.id IS NULL);

-- ============================================
-- STEP 2: Manual fix for specific bus/driver
-- ============================================
-- Replace 'YOUR_BUS_ID' and 'YOUR_DRIVER_ID' with actual IDs
-- This manually does what the app should do

/*
-- Fix bus status
UPDATE buses 
SET 
  status = 'inactive',
  tracking_status = 'stopped',
  driver_id = NULL,
  updated_at = NOW()
WHERE id = 'YOUR_BUS_ID'
RETURNING id, name, status, driver_id, updated_at;

-- Fix driver status
UPDATE drivers 
SET 
  status = 'inactive',
  updated_at = NOW()
WHERE id = 'YOUR_DRIVER_ID'
RETURNING id, name, status, updated_at;
*/

-- ============================================
-- STEP 3: Check RLS policies (if updates are blocked)
-- ============================================
-- If updates are failing, check if RLS is blocking them

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('buses', 'drivers');

-- Check policies for buses table
SELECT 
  policyname,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'buses'
ORDER BY policyname;

-- Check policies for drivers table
SELECT 
  policyname,
  cmd AS command,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'drivers'
ORDER BY policyname;

-- ============================================
-- STEP 4: Create/Update RLS policy if needed
-- ============================================
-- If drivers can't update their own status, create a policy

-- Policy for drivers to update their own status
-- (Adjust based on your auth setup)
/*
CREATE POLICY "Drivers can update their own status"
ON drivers
FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text OR auth.uid()::text = (SELECT user_id FROM drivers WHERE id = drivers.id))
WITH CHECK (auth.uid()::text = id::text OR auth.uid()::text = (SELECT user_id FROM drivers WHERE id = drivers.id));
*/

-- Policy for drivers to update their assigned bus
/*
CREATE POLICY "Drivers can update their assigned bus"
ON buses
FOR UPDATE
TO authenticated
USING (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()::text
  )
)
WITH CHECK (
  driver_id IN (
    SELECT id FROM drivers WHERE user_id = auth.uid()::text
  )
);
*/

-- ============================================
-- STEP 5: Verify the fix worked
-- ============================================
-- After running the fix, check if status updated correctly
SELECT 
  b.id,
  b.name AS bus_name,
  b.status AS bus_status,
  b.driver_id,
  d.name AS driver_name,
  d.status AS driver_status,
  b.updated_at AS bus_updated,
  d.updated_at AS driver_updated,
  CASE 
    WHEN b.status = 'inactive' AND b.driver_id IS NULL THEN '✅ Correctly inactive'
    WHEN b.status = 'active' AND b.driver_id IS NOT NULL AND d.status = 'active' THEN '✅ Correctly active'
    ELSE '⚠️ Still needs attention'
  END AS status_check
FROM buses b
LEFT JOIN drivers d ON b.driver_id = d.id
ORDER BY b.updated_at DESC;


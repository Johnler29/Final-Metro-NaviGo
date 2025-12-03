-- FIX: Add public read policy to buses table so driver app can query buses
-- This is needed for the assignment join to work and for direct bus queries

-- ============================================
-- STEP 1: Check Current Buses RLS Policy
-- ============================================
SELECT 
  'Current Buses RLS' AS check_type,
  tablename,
  policyname,
  cmd AS command,
  qual AS using_expression
FROM pg_policies
WHERE tablename = 'buses'
  AND cmd = 'SELECT';

-- ============================================
-- STEP 2: Add Public Read Policy for Buses
-- ============================================
-- This allows the driver app to read bus data through joins and direct queries
DROP POLICY IF EXISTS "Public read access" ON buses;
CREATE POLICY "Public read access" ON buses 
FOR SELECT 
USING (true);

-- ============================================
-- STEP 3: Verify Policy Was Created
-- ============================================
SELECT 
  'Verification' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'buses' 
        AND cmd = 'SELECT' 
        AND policyname = 'Public read access'
    ) THEN '✅ Public read policy created successfully'
    ELSE '❌ Policy creation failed'
  END AS status;

-- ============================================
-- STEP 4: Test Query (Should Work Now)
-- ============================================
-- This mimics what the driver app does
SELECT 
  'Test Query' AS check_type,
  dba.id AS assignment_id,
  dba.driver_id,
  dba.bus_id,
  dba.is_active,
  b.id AS bus_id_from_join,
  b.bus_number,
  b.name AS bus_name,
  CASE 
    WHEN b.id IS NOT NULL THEN '✅ Join works - bus data loaded'
    ELSE '❌ Join failed - bus data not loaded'
  END AS join_status
FROM driver_bus_assignments dba
LEFT JOIN buses b ON b.id = dba.bus_id
WHERE dba.is_active = true
LIMIT 5;


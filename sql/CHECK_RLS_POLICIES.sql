-- CHECK: Row Level Security policies that might be blocking bus queries
-- This will show what RLS policies exist and if they're blocking the driver app

-- ============================================
-- STEP 1: Check RLS Status
-- ============================================
SELECT 
  'RLS Status' AS check_type,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('buses', 'driver_bus_assignments', 'drivers')
ORDER BY tablename;

-- ============================================
-- STEP 2: Check Existing Policies
-- ============================================
SELECT 
  'RLS Policies' AS check_type,
  tablename,
  policyname,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('buses', 'driver_bus_assignments', 'drivers')
ORDER BY tablename, policyname;

-- ============================================
-- STEP 3: Check if Buses Table Has Public Read Policy
-- ============================================
SELECT 
  'Buses RLS Check' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'buses' 
        AND cmd = 'SELECT' 
        AND (qual LIKE '%true%' OR qual IS NULL)
    ) THEN '✅ Has public read policy'
    ELSE '❌ NO public read policy - drivers cannot query buses'
  END AS status;

-- ============================================
-- STEP 4: Check if Driver Bus Assignments Has Public Read Policy
-- ============================================
SELECT 
  'Assignments RLS Check' AS check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'driver_bus_assignments' 
        AND cmd = 'SELECT' 
        AND (qual LIKE '%true%' OR qual IS NULL)
    ) THEN '✅ Has public read policy'
    ELSE '❌ NO public read policy - drivers cannot query assignments'
  END AS status;

-- ============================================
-- STEP 5: FIX - Add Public Read Policies if Missing
-- ============================================
-- Uncomment and run if policies are missing

-- For buses table
/*
DROP POLICY IF EXISTS "Public read access" ON buses;
CREATE POLICY "Public read access" ON buses 
FOR SELECT 
USING (true);
*/

-- For driver_bus_assignments table
/*
DROP POLICY IF EXISTS "Public read access" ON driver_bus_assignments;
CREATE POLICY "Public read access" ON driver_bus_assignments 
FOR SELECT 
USING (true);
*/

-- For drivers table
/*
DROP POLICY IF EXISTS "Public read access" ON drivers;
CREATE POLICY "Public read access" ON drivers 
FOR SELECT 
USING (true);
*/


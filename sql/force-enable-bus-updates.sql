-- Force enable bus updates by ensuring permissive policies
-- Run this if updates still don't work
-- This is a more aggressive approach that ensures updates work

-- First, drop ALL existing UPDATE policies to avoid conflicts
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'buses' AND cmd = 'UPDATE'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON buses', pol.policyname);
    RAISE NOTICE 'Dropped policy: %', pol.policyname;
  END LOOP;
END $$;

-- Create a single, very permissive UPDATE policy
CREATE POLICY "Allow all bus updates" ON buses
FOR UPDATE
TO public, anon, authenticated, service_role
USING (true)
WITH CHECK (true);

-- Also ensure SELECT works (for fetching updated data)
-- Check if SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'buses' 
    AND cmd = 'SELECT' 
    AND policyname = 'Public read access'
  ) THEN
    CREATE POLICY "Public read access" ON buses
    FOR SELECT
    USING (true);
    RAISE NOTICE 'Created SELECT policy';
  ELSE
    RAISE NOTICE 'SELECT policy already exists';
  END IF;
END $$;

-- Verify policies
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'buses'
ORDER BY cmd, policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All bus update policies reset and recreated!';
  RAISE NOTICE 'Updates should now work from the app.';
END $$;

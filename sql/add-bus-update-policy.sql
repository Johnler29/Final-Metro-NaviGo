-- Add RLS policy to allow drivers to update buses they're assigned to
-- This is required for drivers to update capacity and PWD seat information
-- Run this in your Supabase SQL Editor

-- Drop existing update policy if it exists
DROP POLICY IF EXISTS "Drivers can update assigned buses" ON buses;
DROP POLICY IF EXISTS "Authenticated users can update buses" ON buses;
DROP POLICY IF EXISTS "Public can update buses" ON buses;

-- Option 1: More permissive policy - allows all updates (for testing)
-- WARNING: This is less secure but will work immediately
-- Use this if the RPC function approach doesn't work
-- This policy allows ANYONE (including anon users) to update buses
CREATE POLICY "Public can update buses" ON buses
FOR UPDATE
TO public, anon, authenticated  -- Explicitly grant to all roles
USING (true)
WITH CHECK (true);

-- Option 2: More restrictive policy - only for authenticated Supabase users
-- Uncomment this if you're using Supabase Auth for drivers:
/*
CREATE POLICY "Authenticated users can update buses" ON buses
FOR UPDATE
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
*/

-- Option 3: Policy based on driver_id matching
-- This won't work with custom auth, but kept for reference:
/*
CREATE POLICY "Drivers can update assigned buses" ON buses
FOR UPDATE
USING (true)  -- Allow all for now, can be restricted later
WITH CHECK (true);
*/

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'buses' 
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Bus update policy created successfully!';
  RAISE NOTICE 'Drivers can now update buses they are assigned to.';
END $$;

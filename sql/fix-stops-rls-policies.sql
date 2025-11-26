-- SQL script to fix Row Level Security policies for stops table
-- This allows the admin website to insert, update, and delete stops
-- Run this in your Supabase SQL Editor

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public read access" ON stops;
DROP POLICY IF EXISTS "Public insert access" ON stops;
DROP POLICY IF EXISTS "Public update access" ON stops;
DROP POLICY IF EXISTS "Public delete access" ON stops;

-- Create SELECT policy (read access for everyone)
CREATE POLICY "Public read access" ON stops 
FOR SELECT 
USING (true);

-- Create INSERT policy (allow anyone to insert stops - adjust if you need authentication)
CREATE POLICY "Public insert access" ON stops 
FOR INSERT 
WITH CHECK (true);

-- Create UPDATE policy (allow anyone to update stops - adjust if you need authentication)
CREATE POLICY "Public update access" ON stops 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create DELETE policy (allow anyone to delete stops - adjust if you need authentication)
CREATE POLICY "Public delete access" ON stops 
FOR DELETE 
USING (true);

-- Verify the policies were created
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
WHERE tablename = 'stops'
ORDER BY policyname;


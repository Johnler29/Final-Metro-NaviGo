-- Fix RLS Policy for Users Table - Allow Admins to View All Users
-- Run this in your Supabase SQL Editor

-- First, check if admin_users table exists and has the admin user
-- If not, we'll create a policy that works for authenticated admin users

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;

-- Create a policy that allows authenticated users (admins) to view all users
-- This works if the admin is logged in via Supabase Auth
CREATE POLICY "Authenticated users can view all users" ON public.users
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert users (for admin-created users)
CREATE POLICY "Authenticated users can insert users" ON public.users
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update users
CREATE POLICY "Authenticated users can update users" ON public.users
    FOR UPDATE 
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to delete users
CREATE POLICY "Authenticated users can delete users" ON public.users
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Alternative: If you have an admin_users table, use this instead:
-- Uncomment the following and comment out the above if you have admin_users table

/*
-- Drop the simple policies above
DROP POLICY IF EXISTS "Authenticated users can view all users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can insert users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can update users" ON public.users;
DROP POLICY IF EXISTS "Authenticated users can delete users" ON public.users;

-- Create policies that check admin_users table
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can insert users" ON public.users
    FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can update users" ON public.users
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'superadmin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'superadmin')
        )
    );

CREATE POLICY "Admins can delete users" ON public.users
    FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin', 'superadmin')
        )
    );
*/

-- Verify the policies
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
WHERE tablename = 'users' 
ORDER BY policyname;




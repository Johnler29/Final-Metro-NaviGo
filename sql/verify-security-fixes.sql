-- 🔍 MetroBus Tracker - Security Verification Script
-- Run this after applying the security fixes to verify everything is working

-- ============================================================================
-- 📊 Security Status Check
-- ============================================================================

-- Check overall security status
SELECT * FROM public.check_security_status();

-- ============================================================================
-- 🔒 RLS Status Verification
-- ============================================================================

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 📋 Policy Count Verification
-- ============================================================================

-- Count policies per table
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Has Policies'
        ELSE '❌ No Policies'
    END as status
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- 🔍 Policy Details Verification
-- ============================================================================

-- Show all policies for each table
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 👁️ View Security Verification
-- ============================================================================

-- Check for any remaining SECURITY DEFINER views
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition ILIKE '%security definer%' THEN '⚠️ SECURITY DEFINER'
        ELSE '✅ Normal View'
    END as security_type
FROM pg_views 
WHERE schemaname = 'public'
ORDER BY viewname;

-- ============================================================================
-- 🧪 Test Policy Functionality
-- ============================================================================

-- Test 1: Anonymous user access (should be limited)
SET ROLE anon;
SELECT 'Testing anonymous access...' as test;

-- Try to read routes (should work for active routes only)
SELECT COUNT(*) as active_routes_count FROM public.routes WHERE status = 'active';

-- Try to read all routes (should work for authenticated users)
SELECT COUNT(*) as all_routes_count FROM public.routes;

-- Try to insert feedback (should fail for anonymous)
-- INSERT INTO public.feedback (user_id, bus_id, rating, comment) 
-- VALUES (gen_random_uuid(), gen_random_uuid(), 5, 'Test comment');

-- Reset role
RESET ROLE;

-- ============================================================================
-- 📈 Security Metrics Summary
-- ============================================================================

-- Generate security summary
WITH security_summary AS (
    SELECT 
        COUNT(*) as total_tables,
        COUNT(CASE WHEN rowsecurity THEN 1 END) as tables_with_rls,
        COUNT(CASE WHEN NOT rowsecurity THEN 1 END) as tables_without_rls
    FROM pg_tables 
    WHERE schemaname = 'public'
),
policy_summary AS (
    SELECT 
        COUNT(DISTINCT tablename) as tables_with_policies,
        COUNT(*) as total_policies
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    '📊 Security Summary' as metric,
    s.total_tables::text as value
FROM security_summary s
UNION ALL
SELECT 
    '✅ Tables with RLS',
    s.tables_with_rls::text
FROM security_summary s
UNION ALL
SELECT 
    '❌ Tables without RLS',
    s.tables_without_rls::text
FROM security_summary s
UNION ALL
SELECT 
    '📋 Total Policies',
    p.total_policies::text
FROM policy_summary p
UNION ALL
SELECT 
    '🔒 Tables with Policies',
    p.tables_with_policies::text
FROM policy_summary p;

-- ============================================================================
-- 🎯 Expected Results
-- ============================================================================

/*
Expected Results After Running Security Fixes:

✅ All tables should have RLS enabled
✅ All tables should have appropriate policies
✅ No SECURITY DEFINER views should remain
✅ Anonymous users should have limited access
✅ Authenticated users should have appropriate access
✅ Admins should have full access

Security Status should show:
- routes: ✅ Secure
- stops: ✅ Secure  
- buses: ✅ Secure
- schedules: ✅ Secure
- users: ✅ Secure
- feedback: ✅ Secure
- drivers: ✅ Secure
- bus_capacity_history: ✅ Secure
- passenger_feedback: ✅ Secure
*/

RAISE NOTICE '🔍 Security verification complete!';
RAISE NOTICE '📊 Check the results above to ensure all security issues are resolved';
RAISE NOTICE '🛡️ All tables should show "✅ Secure" status';

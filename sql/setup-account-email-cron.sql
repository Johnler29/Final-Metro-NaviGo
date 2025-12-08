-- ========================================
-- Supabase Cron Setup for Account Creation Emails
-- ========================================
-- Run this script in Supabase SQL Editor to set up automated email notifications
-- when new user accounts are created.

-- ========================================
-- STEP 1: Enable Required Extensions
-- ========================================

-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pgmq for message queue
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Enable pg_net for HTTP requests (if using Edge Functions or external APIs)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ========================================
-- STEP 2: Create Email Queue
-- ========================================
-- Note: You may need to create this via Supabase Dashboard → Queue
-- If pgmq.create is available, uncomment below:

-- SELECT pgmq.create('account_emails');

-- ========================================
-- STEP 3: Create Function to Queue Welcome Emails
-- ========================================

CREATE OR REPLACE FUNCTION queue_account_welcome_email()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
    -- Queue the email task when a new user is created
    PERFORM pgmq.send(
        queue_name => 'account_emails'::text,
        msg => json_build_object(
            'type', 'welcome_email',
            'user_id', new.id,
            'email', COALESCE(new.email, new.raw_user_meta_data->>'email'),
            'name', COALESCE(
                new.raw_user_meta_data->>'name',
                new.raw_user_meta_data->>'full_name',
                split_part(COALESCE(new.email, ''), '@', 1),
                'User'
            ),
            'created_at', new.created_at,
            'metadata', new.raw_user_meta_data
        )::jsonb
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the user creation
        RAISE WARNING 'Failed to queue welcome email for user %: %', new.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION queue_account_welcome_email() TO authenticated;
GRANT EXECUTE ON FUNCTION queue_account_welcome_email() TO service_role;

-- ========================================
-- STEP 4: Create Trigger on User Creation
-- ========================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_queue_welcome_email ON auth.users;

-- Create trigger to automatically queue email on new user signup
CREATE TRIGGER trigger_queue_welcome_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION queue_account_welcome_email();

-- ========================================
-- STEP 5: Create Helper Function to View Queue
-- ========================================

CREATE OR REPLACE FUNCTION view_account_email_queue()
RETURNS TABLE (
    msg_id BIGINT,
    read_ct INTEGER,
    enqueued_at TIMESTAMP WITH TIME ZONE,
    message JSONB
)
LANGUAGE SQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
    SELECT msg_id, read_ct, enqueued_at, message
    FROM pgmq.read('account_emails', 1, 0)
    ORDER BY enqueued_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION view_account_email_queue() TO authenticated;
GRANT EXECUTE ON FUNCTION view_account_email_queue() TO service_role;

-- ========================================
-- STEP 6: Create Function to Archive Processed Messages
-- ========================================

CREATE OR REPLACE FUNCTION archive_processed_email(msg_id_to_archive BIGINT)
RETURNS BOOLEAN
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
    PERFORM pgmq.archive('account_emails', msg_id_to_archive);
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to archive message %: %', msg_id_to_archive, SQLERRM;
        RETURN FALSE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION archive_processed_email(BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_processed_email(BIGINT) TO service_role;

-- ========================================
-- STEP 7: Create Cron Job (Optional - Can be done via Dashboard)
-- ========================================
-- Uncomment and configure the URL below to create cron job via SQL
-- Replace 'YOUR_API_URL' and 'YOUR_CRON_SECRET' with your actual values
-- NOTE: It's recommended to create cron jobs via the Supabase Dashboard instead

-- Example cron job creation (commented out - use Dashboard instead):
-- SELECT cron.schedule(
--     'process_account_emails',
--     '*/5 * * * *',  -- Every 5 minutes (adjust as needed)
--     $$
--     SELECT net.http_post(
--         url := 'YOUR_API_URL/api/cron/process-emails',
--         headers := jsonb_build_object(
--             'Content-Type', 'application/json',
--             'Authorization', 'Bearer YOUR_CRON_SECRET'
--         ),
--         body := jsonb_build_object('action', 'process_queue')
--     ) AS request_id;
--     $$
-- );

-- ========================================
-- STEP 8: Verification Queries
-- ========================================

-- Check if extensions are enabled
SELECT extname, extversion 
FROM pg_extension 
WHERE extname IN ('pg_cron', 'pgmq', 'pg_net');

-- Check if trigger exists
SELECT tgname, tgrelid::regclass, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_queue_welcome_email';

-- Check if function exists
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'queue_account_welcome_email';

-- View queue status (if queue exists)
-- SELECT COUNT(*) as pending_emails FROM pgmq.account_emails;

-- ========================================
-- STEP 9: Testing
-- ========================================

-- Test the queue function manually (optional)
-- This simulates what happens when a user is created
/*
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
    test_email TEXT := 'test@example.com';
BEGIN
    -- Simulate inserting into auth.users
    PERFORM pgmq.send(
        'account_emails',
        json_build_object(
            'type', 'welcome_email',
            'user_id', test_user_id,
            'email', test_email,
            'name', 'Test User',
            'created_at', NOW()
        )::jsonb
    );
    
    RAISE NOTICE 'Test email queued for %', test_email;
END $$;
*/

-- ========================================
-- Cleanup (if needed)
-- ========================================

-- To remove the setup, run the separate cleanup script:
-- See: sql/cleanup-account-email-cron.sql


-- ========================================
-- Cleanup: Remove Account Email Cron Setup
-- ========================================
-- Run this script to remove the account email cron setup
-- WARNING: This will remove triggers, functions, and cron jobs

-- Remove the trigger
DROP TRIGGER IF EXISTS trigger_queue_welcome_email ON auth.users;

-- Remove the functions
DROP FUNCTION IF EXISTS queue_account_welcome_email();
DROP FUNCTION IF EXISTS view_account_email_queue();
DROP FUNCTION IF EXISTS archive_processed_email(BIGINT);

-- Unschedule the cron job (if it exists)
-- Note: This may fail if the cron job doesn't exist, which is fine
DO $$
BEGIN
    PERFORM cron.unschedule('process_account_emails');
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Cron job "process_account_emails" does not exist or already removed';
END $$;

-- Verify cleanup
SELECT 
    'Trigger removed' as status
WHERE NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trigger_queue_welcome_email'
)
UNION ALL
SELECT 
    'Functions removed' as status
WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname IN ('queue_account_welcome_email', 'view_account_email_queue', 'archive_processed_email')
);




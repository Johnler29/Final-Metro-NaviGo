# Step-by-Step Guide: Supabase Cron for Account Creation Emails

This guide will help you set up automated email notifications when new user accounts are created using Supabase's cron and queue system.

## Prerequisites

- Supabase project with admin access
- Email service API key (Resend, SendGrid, or similar)
- Basic knowledge of SQL and API endpoints

---

## Step 1: Enable Required Extensions

1. Go to your **Supabase Dashboard**
2. Navigate to **Database** → **Extensions**
3. Enable the following extensions:
   - `pg_cron` - For scheduling cron jobs
   - `pgmq` - For message queue functionality
   - `pg_net` - For HTTP requests (if using Edge Functions)

**OR** run this SQL in the SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pgmq extension (for queue)
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Enable pg_net extension (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## Step 2: Create Email Queue

1. Go to **Supabase Dashboard** → **Queue** (or **Database** → **Queue**)
2. Click **Create Queue**
3. Configure:
   - **Queue Name**: `account_emails`
   - **Queue Type**: Basic Queue
   - **Enable RLS**: Yes (recommended)
4. Click **Create Queue**

**OR** create it via SQL (if available in your Supabase version):

```sql
-- Create queue for account emails
SELECT pgmq.create('account_emails');
```

---

## Step 3: Create Database Function to Queue Emails

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Function to queue welcome email when account is created
CREATE OR REPLACE FUNCTION queue_account_welcome_email()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET SEARCH_PATH = ''
AS $$
BEGIN
    -- Queue the email task
    PERFORM pgmq.send(
        queue_name => 'account_emails'::text,
        msg => json_build_object(
            'type', 'welcome_email',
            'user_id', new.id,
            'email', COALESCE(new.email, new.raw_user_meta_data->>'email'),
            'name', COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'User'),
            'created_at', new.created_at
        )::jsonb
    );
    
    RETURN NEW;
END;
$$;
```

---

## Step 4: Create Trigger on User Creation

Run this SQL to automatically queue emails when users sign up:

```sql
-- Create trigger to queue email on new user signup
DROP TRIGGER IF EXISTS trigger_queue_welcome_email ON auth.users;

CREATE TRIGGER trigger_queue_welcome_email
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION queue_account_welcome_email();
```

---

## Step 5: Set Up Email Service

Choose one of these options:

### Option A: Use Supabase Edge Functions (Recommended)

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Initialize Edge Functions:
   ```bash
   supabase init
   ```

3. Create email function:
   ```bash
   supabase functions new process-account-emails
   ```

4. See `edge-functions/process-account-emails/index.ts` for implementation

### Option B: Create API Endpoint (Node.js/Express Example)

Create an API endpoint that processes the queue. See `api/process-account-emails.js` for example.

---

## Step 6: Create Cron Job

1. Go to **Supabase Dashboard** → **Database** → **Cron** (or **Integrations** → **Cron**)
2. Click **Create Job**
3. Configure:
   - **Name**: `process_account_emails`
   - **Schedule**: `*/5 * * * *` (every 5 minutes) or `*/30 * * * * *` (every 30 seconds)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: Your API endpoint URL (e.g., `https://your-api.com/api/cron/process-emails`)
   - **Headers**: 
     - `Authorization: Bearer YOUR_CRON_SECRET`
     - `Content-Type: application/json`
4. Click **Create Job**

**OR** create via SQL:

```sql
-- Create cron job to process email queue every 5 minutes
SELECT cron.schedule(
    'process_account_emails',
    '*/5 * * * *', -- Every 5 minutes
    $$
    SELECT net.http_post(
        url := 'https://your-api.com/api/cron/process-emails',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_CRON_SECRET'
        ),
        body := jsonb_build_object('action', 'process_queue')
    ) AS request_id;
    $$
);
```

---

## Step 7: Create API Endpoint to Process Queue

You need an API endpoint that:
1. Authenticates using CRON_SECRET
2. Reads messages from the queue
3. Sends emails via your email service
4. Marks messages as completed

See the example files:
- `api/process-account-emails.js` (Node.js/Express)
- `edge-functions/process-account-emails/index.ts` (Supabase Edge Function)

---

## Step 8: Configure Environment Variables

Set these in your Supabase project or API:

- `EMAIL_SERVICE_API_KEY` - Your email service API key
- `EMAIL_FROM` - Sender email address
- `CRON_SECRET` - Secret for authenticating cron requests
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for queue access)

---

## Step 9: Test the Setup

1. **Test Queue Function**:
   ```sql
   -- Manually test queueing an email
   SELECT pgmq.send(
       'account_emails',
       json_build_object(
           'type', 'welcome_email',
           'email', 'test@example.com',
           'name', 'Test User'
       )::jsonb
   );
   ```

2. **Test User Creation**:
   - Create a test account via your app
   - Check the queue: `SELECT * FROM pgmq.account_emails;`
   - Verify the cron job runs and processes the email

3. **Monitor Logs**:
   - Check Supabase logs for errors
   - Check your email service dashboard for sent emails

---

## Step 10: Monitor and Maintain

1. **Check Queue Status**:
   ```sql
   -- View pending emails
   SELECT * FROM pgmq.account_emails 
   WHERE msg_id NOT IN (
       SELECT msg_id FROM pgmq.account_emails_archive
   );
   ```

2. **View Cron Job Status**:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process_account_emails';
   ```

3. **View Cron Job History**:
   ```sql
   SELECT * FROM cron.job_run_details 
   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process_account_emails')
   ORDER BY start_time DESC 
   LIMIT 10;
   ```

---

## Troubleshooting

### Queue Not Processing
- Verify cron job is enabled: `SELECT * FROM cron.job;`
- Check cron job logs for errors
- Verify API endpoint is accessible and returns 200 status

### Emails Not Sending
- Check email service API key is valid
- Verify email service quota/limits
- Check API endpoint logs for errors

### Trigger Not Firing
- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_queue_welcome_email';`
- Test function manually: `SELECT queue_account_welcome_email();`

---

## Next Steps

- Customize email templates
- Add email for password resets
- Add email for account verification
- Set up email preferences per user
- Add retry logic for failed emails

---

## Files Created

- `sql/setup-account-email-cron.sql` - Complete SQL setup
- `api/process-account-emails.js` - Node.js API endpoint example
- `edge-functions/process-account-emails/index.ts` - Supabase Edge Function example


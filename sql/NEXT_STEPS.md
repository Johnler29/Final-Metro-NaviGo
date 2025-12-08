# Next Steps: Complete Account Email Setup

Follow these steps in order to complete the setup:

## ✅ Step 1: Enable Extensions in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Database** → **Extensions**
3. Enable these extensions:
   - ✅ `pg_cron`
   - ✅ `pgmq`
   - ✅ `pg_net`

**OR** run this in SQL Editor:
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pgmq;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

---

## ✅ Step 2: Create the Queue

1. Go to **Supabase Dashboard** → **Database** → **Queue**
   (If you don't see "Queue", try **Integrations** → **Queue**)
2. Click **Create Queue**
3. Configure:
   - **Queue Name**: `account_emails`
   - **Queue Type**: Basic Queue
   - **Enable RLS**: ✅ Yes
4. Click **Create Queue**

---

## ✅ Step 3: Run the SQL Setup Script

1. Open **Supabase SQL Editor**
2. Open the file: `sql/setup-account-email-cron.sql`
3. Copy the **entire contents** (or just run it directly)
4. Click **Run** (or press Ctrl+J)

This will create:
- The function to queue emails
- The trigger on user creation
- Helper functions

**Verify it worked:**
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_queue_welcome_email';

-- Check if function exists
SELECT proname FROM pg_proc WHERE proname = 'queue_account_welcome_email';
```

---

## ✅ Step 4: Choose Your Email Processing Method

### Option A: Supabase Edge Function (Recommended) ⭐

**4a. Install Supabase CLI:**
```bash
npm install -g supabase
```

**4b. Login and link your project:**
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
(Find your project ref in Supabase Dashboard → Settings → General)

**4c. Deploy the function:**
```bash
supabase functions deploy process-account-emails
```

**4d. Set environment variables in Supabase Dashboard:**
- Go to **Edge Functions** → **process-account-emails** → **Settings**
- Add these secrets:
  - `CRON_SECRET` = (generate a random string)
  - `EMAIL_SERVICE_API_KEY` = (your email service API key)
  - `EMAIL_FROM` = (e.g., `noreply@yourdomain.com`)
  - `SUPABASE_URL` = (your Supabase project URL)
  - `SUPABASE_SERVICE_ROLE_KEY` = (from Settings → API)

**4e. Get your Edge Function URL:**
- Go to **Edge Functions** → **process-account-emails**
- Copy the function URL (e.g., `https://YOUR_PROJECT.supabase.co/functions/v1/process-account-emails`)

---

### Option B: External API (Vercel, Railway, etc.)

**4a. Deploy `api/process-account-emails.js`** to your hosting platform

**4b. Set environment variables** in your hosting platform:
- `CRON_SECRET`
- `EMAIL_SERVICE_API_KEY`
- `EMAIL_FROM`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**4c. Get your API endpoint URL** (e.g., `https://your-api.vercel.app/api/cron/process-emails`)

---

## ✅ Step 5: Create the Cron Job

1. Go to **Supabase Dashboard** → **Database** → **Cron**
   (If you don't see "Cron", try **Integrations** → **Cron**)

2. Click **Create Job**

3. Configure:
   - **Name**: `process_account_emails`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
     - Or `*/30 * * * * *` for every 30 seconds (for testing)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: Your Edge Function URL or API endpoint URL
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```
   - **Body** (optional): `{"action": "process_queue"}`

4. Click **Create Job**

---

## ✅ Step 6: Test the Setup

**6a. Create a test account:**
- Sign up a new user in your app
- Or manually insert a test user (see below)

**6b. Check the queue:**
```sql
-- View queued emails
SELECT * FROM pgmq.account_emails 
ORDER BY enqueued_at DESC 
LIMIT 10;
```

**6c. Wait for cron to run** (or trigger manually):
- Wait 5 minutes for the cron job
- Or manually call your API endpoint:
  ```bash
  curl -X POST https://your-endpoint-url \
    -H "Authorization: Bearer YOUR_CRON_SECRET" \
    -H "Content-Type: application/json"
  ```

**6d. Check your email inbox!** 📧

**6e. Verify processing:**
```sql
-- Check if messages were processed
SELECT COUNT(*) as pending FROM pgmq.account_emails;
```

---

## ✅ Step 7: Monitor and Verify

**Check cron job status:**
```sql
SELECT * FROM cron.job WHERE jobname = 'process_account_emails';
```

**View cron job history:**
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'process_account_emails')
ORDER BY start_time DESC 
LIMIT 10;
```

**Check Edge Function logs:**
- Go to **Edge Functions** → **process-account-emails** → **Logs**

---

## 🐛 Troubleshooting

**Queue not processing?**
- Verify cron job is enabled: `SELECT * FROM cron.job;`
- Check Edge Function/API logs for errors
- Verify CRON_SECRET matches in both places

**Emails not sending?**
- Verify email service API key is correct
- Check email service quota/limits
- Review Edge Function/API logs

**Trigger not firing?**
- Test with a new user signup
- Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_queue_welcome_email';`

---

## 📝 Quick Test Query

To manually test the queue function:

```sql
-- Manually queue a test email
SELECT pgmq.send(
    'account_emails',
    json_build_object(
        'type', 'welcome_email',
        'user_id', gen_random_uuid(),
        'email', 'test@example.com',
        'name', 'Test User',
        'created_at', NOW()
    )::jsonb
);
```

Then wait for cron to process it or call your API endpoint manually.

---

## 🎉 You're Done!

Once all steps are complete, every new user signup will automatically:
1. Trigger the database function
2. Queue an email in `account_emails` queue
3. Be processed by the cron job
4. Send a welcome email via your email service




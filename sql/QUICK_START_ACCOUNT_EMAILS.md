# Quick Start: Account Creation Emails with Supabase Cron

## 🚀 5-Minute Setup

### Step 1: Enable Extensions (Supabase Dashboard)
1. Go to **Database** → **Extensions**
2. Enable: `pg_cron`, `pgmq`, `pg_net`

### Step 2: Create Queue (Supabase Dashboard)
1. Go to **Database** → **Queue** (or **Integrations** → **Queue**)
2. Click **Create Queue**
3. Name: `account_emails`
4. Enable RLS: ✅

### Step 3: Run SQL Setup
1. Open **SQL Editor** in Supabase
2. Copy and paste contents of `sql/setup-account-email-cron.sql`
3. Click **Run**

### Step 4: Deploy API Endpoint
Choose one:

**Option A: Supabase Edge Function** (Recommended)
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref your-project-ref

# Deploy function
supabase functions deploy process-account-emails
```

**Option B: External API** (Vercel, Railway, etc.)
- Deploy `api/process-account-emails.js`
- Set environment variables

### Step 5: Create Cron Job
1. Go to **Database** → **Cron** (or **Integrations** → **Cron**)
2. Click **Create Job**
3. Configure:
   - **Name**: `process_account_emails`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Type**: HTTP Request
   - **URL**: Your API endpoint URL
   - **Headers**: `Authorization: Bearer YOUR_CRON_SECRET`

### Step 6: Set Environment Variables
In your API/Edge Function, set:
- `CRON_SECRET` - Random secret string
- `EMAIL_SERVICE_API_KEY` - Your email service key
- `EMAIL_FROM` - Sender email
- `SUPABASE_URL` - Your Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key

### Step 7: Test
1. Create a test account in your app
2. Check queue: Run `SELECT * FROM pgmq.account_emails;` in SQL Editor
3. Wait for cron to run (or trigger manually)
4. Check your email!

---

## 📋 Checklist

- [ ] Extensions enabled (pg_cron, pgmq, pg_net)
- [ ] Queue created (`account_emails`)
- [ ] SQL setup script run
- [ ] API endpoint deployed
- [ ] Cron job created
- [ ] Environment variables set
- [ ] Test account created
- [ ] Email received ✅

---

## 🔧 Troubleshooting

**Queue not processing?**
- Check cron job is enabled: `SELECT * FROM cron.job;`
- Verify API endpoint URL is correct
- Check API logs for errors

**Emails not sending?**
- Verify email service API key
- Check email service quota
- Review API endpoint logs

**Trigger not firing?**
- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'trigger_queue_welcome_email';`
- Test with a new user signup

---

## 📚 Full Documentation

See `sql/setup-account-email-cron.md` for detailed instructions.




# Vercel Setup for Account Email Processing

This guide will help you deploy the account email processing API to Vercel.

## 📋 Prerequisites

- Vercel account
- Supabase project with queue and SQL setup completed
- Email service API key (Resend, SendGrid, etc.)

---

## 🚀 Step 1: Prepare Your Project

### Option A: Add to Existing Vercel Project

If you already have a Vercel project:

1. **Create the API route:**
   - Copy `api/cron/process-emails.js` to your project
   - Place it at: `api/cron/process-emails.js` (relative to project root)

2. **Install dependencies** (if not already installed):
   ```bash
   npm install @supabase/supabase-js
   # And your email service SDK (e.g., npm install resend)
   ```

### Option B: Create New Vercel Project

1. **Initialize a new project:**
   ```bash
   mkdir navigo-email-api
   cd navigo-email-api
   npm init -y
   ```

2. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js
   # Add your email service (e.g., npm install resend)
   ```

3. **Create the API route:**
   - Copy `api/cron/process-emails.js` to your project
   - Ensure the file structure is: `api/cron/process-emails.js`

4. **Create `package.json` scripts** (optional):
   ```json
   {
     "scripts": {
       "dev": "vercel dev",
       "deploy": "vercel --prod"
     }
   }
   ```

---

## 🔧 Step 2: Configure Email Service

Choose and configure your email service in `api/cron/process-emails.js`:

### Using Resend (Recommended)

1. **Sign up at [resend.com](https://resend.com)**
2. **Get your API key**
3. **Install the SDK:**
   ```bash
   npm install resend
   ```
4. **Update the `sendWelcomeEmail` function:**
   ```javascript
   const { Resend } = require('resend');
   const resend = new Resend(emailApiKey);
   
   const { data, error } = await resend.emails.send({
     from: emailFrom,
     to: email,
     subject: 'Welcome to NaviGO!',
     html: `
       <h1>Welcome ${name}!</h1>
       <p>Thank you for creating an account with NaviGO.</p>
     `,
   });
   
   if (error) throw new Error(`Email error: ${error.message}`);
   return data;
   ```

### Using SendGrid

1. **Sign up at [sendgrid.com](https://sendgrid.com)**
2. **Get your API key**
3. **Install the SDK:**
   ```bash
   npm install @sendgrid/mail
   ```
4. **Update the `sendWelcomeEmail` function** (see example in the file)

---

## 🔐 Step 3: Set Environment Variables in Vercel

1. Go to your **Vercel Dashboard**
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:

   | Variable Name | Value | Description |
   |--------------|-------|-------------|
   | `CRON_SECRET` | `your-random-secret-string` | Generate a random string (e.g., use `openssl rand -hex 32`) |
   | `SUPABASE_URL` | `https://your-project.supabase.co` | Your Supabase project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | `your-service-role-key` | From Supabase Dashboard → Settings → API |
   | `EMAIL_SERVICE_API_KEY` | `your-email-api-key` | Your email service API key |
   | `EMAIL_FROM` | `noreply@yourdomain.com` | Sender email address (must be verified with email service) |

5. **Important:** Make sure to add these for **Production**, **Preview**, and **Development** environments (or at least Production)

---

## 📤 Step 4: Deploy to Vercel

### Using Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

### Using Vercel Dashboard

1. **Connect your Git repository** to Vercel
2. **Import your project**
3. Vercel will automatically detect and deploy

---

## 🔗 Step 5: Get Your API Endpoint URL

After deployment, Vercel will provide you with a URL like:
```
https://your-project.vercel.app/api/cron/process-emails
```

**Save this URL** - you'll need it for the Supabase cron job!

---

## ✅ Step 6: Test Your Endpoint

### Test Health Check:
```bash
curl https://your-project.vercel.app/api/cron/process-emails
```

Should return:
```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "service": "account-email-processor"
}
```

### Test Processing (with authentication):
```bash
curl -X POST https://your-project.vercel.app/api/cron/process-emails \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

Should return:
```json
{
  "success": true,
  "timestamp": "2024-...",
  "processed": 0,
  "failed": 0,
  "errors": []
}
```

---

## 🔄 Step 7: Configure Supabase Cron Job

1. Go to **Supabase Dashboard** → **Database** → **Cron**
   (Or **Integrations** → **Cron**)

2. Click **Create Job**

3. Configure:
   - **Name**: `process_account_emails`
   - **Schedule**: `*/5 * * * *` (every 5 minutes)
   - **Type**: HTTP Request
   - **Method**: POST
   - **URL**: `https://your-project.vercel.app/api/cron/process-emails`
   - **Headers**: 
     ```
     Authorization: Bearer YOUR_CRON_SECRET
     Content-Type: application/json
     ```
   - **Body** (optional): `{"action": "process_queue"}`

4. Click **Create Job**

**Important:** Make sure `YOUR_CRON_SECRET` matches the value you set in Vercel!

---

## 🧪 Step 8: Test the Complete Flow

1. **Create a test account** in your app
2. **Check the queue:**
   ```sql
   SELECT * FROM pgmq.account_emails ORDER BY enqueued_at DESC LIMIT 5;
   ```
3. **Wait for cron to run** (or trigger manually via curl)
4. **Check Vercel logs:**
   - Go to Vercel Dashboard → Your Project → **Deployments** → Click on latest deployment → **Functions** → `api/cron/process-emails` → **Logs**
5. **Check your email inbox!** 📧

---

## 📊 Monitoring

### View Vercel Function Logs:
- Vercel Dashboard → Project → **Deployments** → Latest → **Functions** → **Logs**

### View Supabase Queue:
```sql
SELECT COUNT(*) as pending FROM pgmq.account_emails;
```

### View Cron Job Status:
```sql
SELECT * FROM cron.job WHERE jobname = 'process_account_emails';
```

---

## 🐛 Troubleshooting

### 401 Unauthorized
- Verify `CRON_SECRET` matches in both Vercel and Supabase cron job
- Check the Authorization header format: `Bearer YOUR_SECRET`

### 500 Internal Server Error
- Check Vercel function logs
- Verify all environment variables are set
- Check email service API key is valid

### Emails Not Sending
- Verify email service API key
- Check email service quota/limits
- Ensure `EMAIL_FROM` is verified with your email service
- Check Vercel function logs for errors

### Queue Not Processing
- Verify cron job is enabled in Supabase
- Check cron job schedule is correct
- Verify API endpoint URL is correct
- Check Vercel function logs

---

## 📝 Next Steps

1. Customize email templates (see `templates/welcome-email-template.html`)
2. Add retry logic for failed emails
3. Set up email service webhooks for delivery tracking
4. Add monitoring/alerting for failed jobs

---

## 🎉 You're Done!

Your account email system is now set up on Vercel! Every new user signup will:
1. Trigger the database function
2. Queue an email in `account_emails` queue
3. Be processed by the Supabase cron job
4. Send a welcome email via your email service




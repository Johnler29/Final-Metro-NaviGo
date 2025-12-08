# Password Reset Setup Instructions

## Problem
When users click the password reset link in their email, it opens `localhost:3000` in a browser instead of opening the app.

## Solution

### Step 1: Configure Redirect URL in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Under **Redirect URLs**, add:
   ```
   https://bukrffymmsdbpqxmdwbv.supabase.co/auth/v1/callback
   ```
   (Replace with your actual Supabase project URL if different)

### Step 2: How It Works

1. User requests password reset → Email is sent
2. User clicks link in email → Redirected to Supabase callback URL
3. Supabase processes the token and sets a recovery session
4. The app detects the `PASSWORD_RECOVERY` event
5. `ResetPasswordScreen` is shown automatically

### Step 3: Testing

1. Request a password reset from the app
2. Check your email and click the reset link
3. The link will open in a browser first (this is normal)
4. If the app is installed, it should open automatically
5. If not, manually open the app - it will detect the recovery session

### Alternative: Use Deep Link (Advanced)

If you want the link to open the app directly, you'll need to:
1. Create a web page that redirects to your app's deep link
2. Configure that web page URL in Supabase
3. The web page extracts the token and redirects: `exp+metrobustracker://reset-password?token=...`

For now, the Supabase callback URL approach is simpler and works reliably.









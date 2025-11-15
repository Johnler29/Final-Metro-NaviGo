# 🚀 Quick Vercel Deployment Guide

## Prerequisites
- GitHub account
- Vercel account (free tier works great)
- Your Supabase credentials

## Step-by-Step Deployment

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Push your code to GitHub**
   ```bash
   cd admin-website
   git init  # if not already a git repo
   git add .
   git commit -m "Ready for Vercel deployment"
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Go to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Sign up/Login with your GitHub account

3. **Import Project**
   - Click "Add New..." → "Project"
   - Select your GitHub repository
   - Click "Import"

4. **Configure Project Settings**
   - **Root Directory:** Click "Edit" and set to `admin-website`
   - **Framework Preset:** Create React App (auto-detected)
   - **Build Command:** `npm run build` (already set)
   - **Output Directory:** `build` (already set)
   - **Install Command:** `npm install` (already set)

5. **Add Environment Variables**
   Click "Environment Variables" and add:
   - `REACT_APP_SUPABASE_URL` = `your_supabase_project_url`
   - `REACT_APP_SUPABASE_ANON_KEY` = `your_supabase_anon_key`

6. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 1-2 minutes)
   - Your site will be live at `your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Navigate to admin-website**
   ```bash
   cd admin-website
   ```

3. **Login to Vercel**
   ```bash
   vercel login
   ```

4. **Deploy**
   ```bash
   vercel
   ```
   - Follow the prompts
   - When asked for environment variables, add:
     - `REACT_APP_SUPABASE_URL`
     - `REACT_APP_SUPABASE_ANON_KEY`

5. **For production deployment**
   ```bash
   vercel --prod
   ```

## Environment Variables Setup

In Vercel Dashboard → Project Settings → Environment Variables, add:

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `REACT_APP_SUPABASE_URL` | `https://your-project.supabase.co` | Production, Preview, Development |
| `REACT_APP_SUPABASE_ANON_KEY` | `your_anon_key_here` | Production, Preview, Development |

**Important:** 
- Variable names MUST start with `REACT_APP_` for Create React App
- After adding variables, you need to redeploy for changes to take effect

## Post-Deployment

1. **Test your deployment**
   - Visit your Vercel URL
   - Test login functionality
   - Verify all features work

2. **Custom Domain (Optional)**
   - Go to Project Settings → Domains
   - Add your custom domain
   - Follow DNS configuration instructions

3. **Monitor Deployments**
   - All deployments are tracked in Vercel dashboard
   - Each git push automatically triggers a new deployment
   - Preview deployments are created for pull requests

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18.x by default)

### Environment Variables Not Working
- Ensure variable names start with `REACT_APP_`
- Redeploy after adding variables
- Check variable values are correct (no extra spaces)

### 404 Errors on Page Refresh
- The `vercel.json` file handles this with rewrites
- If issues persist, check that `vercel.json` is in the `admin-website` folder

### Supabase Connection Issues
- Verify your Supabase URL and key are correct
- Check Supabase project is active
- Ensure RLS policies allow your Vercel domain

## Automatic Deployments

Vercel automatically deploys:
- **Production:** Every push to `main` branch
- **Preview:** Every push to other branches or pull requests

You can disable auto-deployments in Project Settings if needed.

## Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Create React App Deployment](https://create-react-app.dev/docs/deployment/#vercel)
- Check your project's `DEPLOYMENT_GUIDE.md` for more details


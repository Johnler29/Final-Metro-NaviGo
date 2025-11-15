# Quick API Key Setup (You Already Have the Key!)

Since you already have a Google Maps API key with Directions API enabled, just follow these 2 steps:

## ✅ Step 1: Create `.env.local` File

In the `admin-website` folder, create a file named `.env.local`:

**Windows (PowerShell):**
```powershell
cd admin-website
New-Item -Path .env.local -ItemType File
```

**Windows (Command Prompt):**
```cmd
cd admin-website
type nul > .env.local
```

**Mac/Linux:**
```bash
cd admin-website
touch .env.local
```

## ✅ Step 2: Add Your API Key

Open `.env.local` and add this line (replace with your actual API key):

```bash
REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_API_KEY_HERE
```

**Example:**
```bash
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuvwxyz
```

## ✅ Step 3: Restart Admin Website

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm start
```

## 🎉 Done!

Now when you:
1. Go to Route Management
2. Click ⋮ on a route → "Manage Stops"
3. Click "Generate Route Path" button

Your routes will automatically follow actual roads! 🗺️

## 🧪 Test It

1. Open any route with 2+ stops
2. Click "Manage Stops"
3. Click the blue "Generate Route Path" button
4. Wait 2-3 seconds
5. Check mobile app - route now follows roads! ✅

## 📝 Important Notes

- ✅ File must be named exactly: `.env.local`
- ✅ Variable name must be exactly: `REACT_APP_GOOGLE_MAPS_API_KEY`
- ✅ No quotes around the API key
- ✅ Restart required after adding/changing
- ✅ File is automatically ignored by git (won't be committed)

## 🔒 Security

The `.env.local` file is automatically ignored by git, so your API key won't be committed to your repository. Perfect for local development!

---

**That's it! You're ready to generate accurate routes!** 🚀


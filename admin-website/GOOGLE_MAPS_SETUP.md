# Google Maps API Setup for Accurate Routes

## Overview
This guide will help you set up Google Maps Directions API to make your bus routes follow actual roads instead of straight lines.

## ✨ What You'll Get

**Before (Current):**
```
Stop A -------- Stop B
  (straight line)
```

**After (With Google Maps):**
```
Stop A 
   ╲
    ╲___
       ╲___  (follows actual road)
          ╲___
             ╲_ Stop B
```

## 🎯 Step 1: Get Google Maps API Key

### 1. Go to Google Cloud Console
Visit: https://console.cloud.google.com/

### 2. Create or Select a Project
- Click "Select a project" at the top
- Click "New Project"
- Name it "NaviGO Bus Tracking"
- Click "Create"

### 3. Enable Directions API
1. Go to "APIs & Services" > "Library"
2. Search for "Directions API"
3. Click on it
4. Click "Enable"

### 4. Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the API key (looks like: `AIzaSyDXXXXXXXXXXXXXXXXXXXX`)

### 5. Restrict API Key (Important!)
1. Click on your new API key
2. Under "Application restrictions":
   - Select "HTTP referrers (web sites)"
   - Add your domains:
     ```
     localhost:3000/*
     localhost:3001/*
     your-admin-domain.com/*
     ```
3. Under "API restrictions":
   - Select "Restrict key"
   - Check "Directions API"
4. Click "Save"

## 🔧 Step 2: Add API Key to Your Project

### For Admin Website

Create or edit `.env.local` in `admin-website/` folder:

```bash
# Google Maps API Key for route directions
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDXXXXXXXXXXXXXXXXXXXX
```

Replace `AIzaSyDXXXXXXXXXXXXXXXXXXXX` with your actual API key.

### Restart Admin Website

```bash
cd admin-website
npm start
```

## 🚀 Step 3: Generate Accurate Routes

### Option A: Automatic (When You Add/Edit Stops)
Routes are automatically generated when you:
- Add a new stop
- Delete a stop
- Reorder stops

### Option B: Manual Button
1. Go to Route Management
2. Click ⋮ on a route
3. Select "Manage Stops"
4. Click the blue "Generate Route Path" button

## 📊 How It Works

```
┌─────────────────────────────────────────────────┐
│ Admin Panel                                     │
│                                                 │
│ 1. You add stops                                │
│    Stop 1: Dasmarinas (14.3294, 120.9366)      │
│    Stop 2: Imus (14.3394, 120.9466)            │
│    Stop 3: Bacoor (14.3514, 120.9586)          │
│                                                 │
│ 2. Click "Generate Route Path"                 │
│    ↓                                            │
│    [Calls Google Maps Directions API]          │
│    ↓                                            │
│ 3. Receives accurate road path                 │
│    ~50-100 coordinate points                   │
│                                                 │
│ 4. Saves to database                           │
│    Stored in routes.route_coordinates          │
└─────────────────────────────────────────────────┘
         ↓
┌─────────────────────────────────────────────────┐
│ Mobile App                                      │
│                                                 │
│ 1. Fetches route from database                 │
│ 2. Displays accurate path on map               │
│ 3. Path follows real roads!                    │
└─────────────────────────────────────────────────┘
```

## 💰 Pricing (Google Maps)

### Free Tier
- **$200 free credit per month**
- Directions API: $5 per 1,000 requests
- **Free quota**: ~40,000 requests/month

### Your Usage
- Generating route: 1 API call
- If you have 50 routes: 50 API calls
- Cost: ~$0.25 one-time
- **Practically FREE for your use case!**

### Cost Optimization
Routes are generated once and stored in database:
- ✅ No API calls from mobile app
- ✅ No repeated calls
- ✅ Only regenerate when stops change

## 🧪 Testing

### Test with Your Existing Route

1. Open admin panel
2. Go to Route Management
3. Find "Dasmarinas - Alabang" (R001)
4. Click ⋮ → "Manage Stops"
5. Click "Generate Route Path" button

**What happens:**
```
Console: Generating route path...
Console: ✅ Fetched 87 coordinate points for route
Console: ✅ Saved 87 coordinates for route...
Toast: Route path generated successfully!
```

6. Open mobile app
7. View the route on map
8. **See accurate path following highways!** 🎉

## 🔍 Troubleshooting

### Error: "Google Maps API key not provided"
- Check `.env.local` file exists
- Check environment variable name is exactly: `REACT_APP_GOOGLE_MAPS_API_KEY`
- Restart admin website

### Error: "This API project is not authorized"
- Check API key restrictions
- Make sure Directions API is enabled
- Add your domain to allowed referrers

### Routes Still Show Straight Lines
- Check if route has `route_coordinates` in database
- Click "Generate Route Path" button manually
- Check browser console for errors
- Verify API key is valid

### "Failed to generate route path"
- Check Google Cloud Console for errors
- Verify billing is enabled (free tier okay)
- Check API quota hasn't been exceeded

## 🎛️ Fallback Behavior

### Without API Key
Routes still work but use simple interpolation:
- Straight lines between stops
- 3-4 interpolated points between each stop
- Basic but functional

### With API Key
Routes follow actual roads:
- 50-100+ coordinate points
- Follows highways, streets, curves
- Professional appearance

## 📝 Database Schema

Routes are stored in your existing database:

```sql
-- Routes table
ALTER TABLE routes ADD COLUMN IF NOT EXISTS route_coordinates JSONB;

-- Stores array of coordinates:
-- [
--   {"latitude": 14.3294, "longitude": 120.9366},
--   {"latitude": 14.3298, "longitude": 120.9371},
--   ...
-- ]
```

## 🎨 Visual Comparison

### Simple Path (No API Key)
```
Start Stop
    |
    |  (4 points)
    |
End Stop
```

### Accurate Path (With Google Maps)
```
Start Stop
    \
     \___
        \____  (87 points)
            \_____
                \___
                   \_ End Stop
```

## ⚡ Quick Start (2 Minutes)

```bash
# 1. Get API key from Google Cloud Console
# Visit: https://console.cloud.google.com/

# 2. Add to .env.local
echo "REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_KEY_HERE" >> admin-website/.env.local

# 3. Restart admin
cd admin-website
npm start

# 4. Test
# - Open Route Management
# - Click "Generate Route Path" on any route
# - Check mobile app - routes now follow roads!
```

## 🌟 Pro Tips

### 1. Generate Routes in Bulk
After adding all your routes, generate paths for all:
1. Go through each route
2. Click "Generate Route Path"
3. One-time setup, permanent benefit

### 2. Regenerate After Stop Changes
Route automatically regenerates when you:
- Add stops
- Delete stops
But you might want to manually regenerate if you:
- Reorder stops significantly
- Change stop locations

### 3. Monitor API Usage
Check Google Cloud Console > Billing to see:
- API requests made
- Costs (should be ~$0)
- Remaining free credits

### 4. Alternative: OpenRouteService
If you prefer free open-source alternative:
- Use OpenRouteService API (5000 requests/day free)
- Modify `routeDirections.js` to use ORS endpoint
- Similar functionality, no Google account needed

## 📚 Additional Resources

- [Google Maps Directions API Docs](https://developers.google.com/maps/documentation/directions)
- [Google Cloud Console](https://console.cloud.google.com/)
- [API Key Best Practices](https://developers.google.com/maps/api-security-best-practices)

## ✅ Summary

With Google Maps integration:
1. ✅ Routes follow actual roads
2. ✅ Professional appearance
3. ✅ Accurate distances
4. ✅ One-time API calls
5. ✅ Practically free
6. ✅ Works offline in mobile app
7. ✅ Auto-generates on stop changes

**Setup time: 5-10 minutes**
**Cost: Effectively FREE**
**Result: Professional-grade route mapping! 🎯**


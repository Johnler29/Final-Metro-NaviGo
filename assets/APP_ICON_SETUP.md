# App Icon Setup Guide

This guide explains how to set up the Navi-GO logo as your Android APK app icon.

## Files Created

1. **`logo-full.svg`** - Full logo with text (copied from admin-website)
2. **`app-icon-square.svg`** - Square version optimized for app icons (1024x1024)
3. **`adaptive-icon-foreground.svg`** - Foreground image for Android adaptive icons

## Quick Setup (Recommended)

### Option 1: Using the Generation Script

1. **Install sharp** (image processing library):
   ```bash
   npm install sharp --save-dev
   ```

2. **Generate PNG icons**:
   ```bash
   npm run generate-icons
   ```

   This will create:
   - `icon.png` (1024x1024) - Main app icon
   - `adaptive-icon.png` (1024x1024) - Android adaptive icon foreground
   - `splash-icon.png` (2048x2048) - Splash screen icon
   - `favicon.png` (512x512) - Web favicon

3. **Rebuild your app**:
   ```bash
   npm run android
   # or
   expo prebuild
   ```

### Option 2: Manual Conversion (If script doesn't work)

If you don't want to use the script, you can manually convert the SVG files:

1. **Use an online converter**:
   - Visit https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png
   - Upload `assets/app-icon-square.svg`
   - Set output size to **1024x1024**
   - Download as `icon.png` and save to `assets/` folder

2. **For adaptive icon**:
   - Upload `assets/adaptive-icon-foreground.svg`
   - Set output size to **1024x1024**
   - Download as `adaptive-icon.png` and save to `assets/` folder

3. **For splash screen**:
   - Upload `assets/app-icon-square.svg`
   - Set output size to **2048x2048**
   - Download as `splash-icon.png` and save to `assets/` folder

## App Configuration

The `app.json` is already configured to use these icons:

```json
{
  "icon": "./assets/icon.png",
  "splash": {
    "image": "./assets/splash-icon.png",
    "backgroundColor": "#fbbf24"
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/adaptive-icon.png",
      "backgroundColor": "#fbbf24"
    }
  }
}
```

## Icon Specifications

- **icon.png**: 1024x1024 pixels, PNG format
- **adaptive-icon.png**: 1024x1024 pixels, PNG format (will be cropped to circle/square by Android)
- **splash-icon.png**: 2048x2048 pixels, PNG format (recommended for high DPI displays)

## Design Notes

- The app icon uses the Navi-GO logo with:
  - Bus icon representing transportation
  - Navigation arrow for real-time tracking
  - GPS indicator showing location services
  - Amber background (#FBBF24) matching your brand
  - "Navi-GO" text for brand recognition

- The adaptive icon foreground is designed with a safe area in mind (content won't be cropped)

## Troubleshooting

### Icons not showing up after rebuild

1. Clear build cache:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

2. Clear Expo cache:
   ```bash
   npm run reset
   ```

3. Rebuild:
   ```bash
   expo prebuild --clean
   npm run android
   ```

### Icon looks blurry

- Ensure PNG files are exactly 1024x1024 pixels
- Use high-quality source SVG files
- Avoid upscaling smaller images

### Adaptive icon not working

- Ensure `adaptive-icon.png` is 1024x1024
- Check that important content is within the center 66% of the image (safe area)
- Verify `app.json` has the correct path

## Next Steps

After generating icons:

1. ✅ Icons are generated in `assets/` folder
2. ✅ `app.json` is configured correctly
3. 🔄 Rebuild your app: `npm run android` or `expo prebuild`
4. 📱 Test on a device or emulator to see the new icon

## Additional Resources

- [Expo App Icons Documentation](https://docs.expo.dev/guides/app-icons/)
- [Android Adaptive Icons Guide](https://developer.android.com/guide/practices/ui_guidelines/icon_design_adaptive)



/**
 * Script to generate app icons from SVG files
 * 
 * This script requires sharp or another image processing library.
 * Install dependencies: npm install sharp --save-dev
 * 
 * Usage: node scripts/generate-app-icons.js
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Error: sharp is not installed.');
  console.log('📦 Install it with: npm install sharp --save-dev');
  console.log('\nAlternatively, you can use online tools to convert SVG to PNG:');
  console.log('1. Visit https://convertio.co/svg-png/ or https://cloudconvert.com/svg-to-png');
  console.log('2. Upload the SVG files from assets/');
  console.log('3. Set size to 1024x1024 for icon.png and adaptive-icon.png');
  console.log('4. Download and save to assets/ folder');
  process.exit(1);
}

const assetsDir = path.join(__dirname, '..', 'assets');
const outputSizes = {
  'icon.png': 1024,
  'adaptive-icon.png': 1024,
  'splash-icon.png': 2048,
  'favicon.png': 512
};

async function generateIcons() {
  console.log('🎨 Generating app icons from SVG files...\n');

  // Generate icon.png from app-icon-square.svg
  const iconSvg = path.join(assetsDir, 'app-icon-square.svg');
  if (fs.existsSync(iconSvg)) {
    try {
      await sharp(iconSvg)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(assetsDir, 'icon.png'));
      console.log('✅ Generated icon.png (1024x1024)');
    } catch (error) {
      console.error('❌ Error generating icon.png:', error.message);
    }
  } else {
    console.log('⚠️  app-icon-square.svg not found, skipping icon.png');
  }

  // Generate adaptive-icon.png from adaptive-icon-foreground.svg
  const adaptiveSvg = path.join(assetsDir, 'adaptive-icon-foreground.svg');
  if (fs.existsSync(adaptiveSvg)) {
    try {
      await sharp(adaptiveSvg)
        .resize(1024, 1024)
        .png()
        .toFile(path.join(assetsDir, 'adaptive-icon.png'));
      console.log('✅ Generated adaptive-icon.png (1024x1024)');
    } catch (error) {
      console.error('❌ Error generating adaptive-icon.png:', error.message);
    }
  } else {
    console.log('⚠️  adaptive-icon-foreground.svg not found, skipping adaptive-icon.png');
  }

  // Generate splash-icon.png (larger for splash screen)
  if (fs.existsSync(iconSvg)) {
    try {
      await sharp(iconSvg)
        .resize(2048, 2048, {
          fit: 'contain',
          background: { r: 251, g: 191, b: 36, alpha: 1 } // #FBBF24
        })
        .png()
        .toFile(path.join(assetsDir, 'splash-icon.png'));
      console.log('✅ Generated splash-icon.png (2048x2048)');
    } catch (error) {
      console.error('❌ Error generating splash-icon.png:', error.message);
    }
  }

  // Generate favicon.png
  const faviconSvg = path.join(__dirname, '..', 'admin-website', 'src', 'assets', 'favicon.svg');
  if (fs.existsSync(faviconSvg)) {
    try {
      await sharp(faviconSvg)
        .resize(512, 512)
        .png()
        .toFile(path.join(assetsDir, 'favicon.png'));
      console.log('✅ Generated favicon.png (512x512)');
    } catch (error) {
      console.error('❌ Error generating favicon.png:', error.message);
    }
  } else {
    console.log('⚠️  favicon.svg not found, skipping favicon.png');
  }

  console.log('\n✨ Icon generation complete!');
  console.log('\n📝 Next steps:');
  console.log('1. Review the generated PNG files in assets/');
  console.log('2. The app.json is already configured to use these icons');
  console.log('3. Rebuild your app: npm run android or expo prebuild');
}

generateIcons().catch(console.error);

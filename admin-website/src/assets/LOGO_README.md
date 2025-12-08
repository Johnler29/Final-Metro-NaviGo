# Navi-GO Logo Assets

This directory contains the logo assets for the Navi-GO system.

## Available Logo Files

### 1. `logo.svg` (200x60px)
Full logo with icon and text. Use for headers and main branding areas.

### 2. `logo-full.svg` (180x50px)
Compact full logo version. Use for navigation bars and smaller spaces.

### 3. `logo-icon.svg` (60x60px)
Icon-only version. Use for favicons, app icons, and compact spaces like sidebars.

### 4. `favicon.svg` (32x32px)
Favicon version optimized for browser tabs. Square format with simplified design.

## Usage

### In React Components

```jsx
import NaviGoLogo from '../components/Logo';

// Icon only
<NaviGoLogo variant="icon" className="w-10 h-10" />

// Full logo
<NaviGoLogo variant="full" className="w-40" />

// Default (full with text)
<NaviGoLogo variant="default" />
```

### Direct Image Import

```jsx
import logoIcon from '../assets/logo-icon.svg';

<img src={logoIcon} alt="Navi-GO Logo" width="60" height="60" />
```

## Logo Design

The Navi-GO logo combines:
- **Bus icon**: Represents transportation and fleet management
- **Navigation arrow**: Symbolizes real-time tracking and movement
- **GPS indicator**: Shows location tracking capabilities
- **Color scheme**: Primary amber (#F59E0B) with dark gray text

## Color Palette

- **Primary**: #F59E0B (Amber/Orange)
- **Text**: #1F2937 (Dark Gray)
- **Accent**: #10B981 (Green for GPS indicators)
- **Background**: #FFFFFF (White)

## Best Practices

1. **Minimum size**: Keep logo at least 40px wide for readability
2. **Spacing**: Maintain clear space around the logo (at least 20% of logo width)
3. **Background**: Logo works best on white or light backgrounds
4. **Dark mode**: Consider inverting colors for dark themes

## File Formats

All logos are provided in SVG format for:
- Scalability at any size
- Small file sizes
- Crisp rendering on all displays
- Easy customization via CSS


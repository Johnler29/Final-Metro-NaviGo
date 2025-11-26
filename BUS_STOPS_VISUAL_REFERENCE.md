# Bus Stops Visual Design Reference 🎨

## Design Specifications

### Stop Marker Design
```
┌─────────────────────────────┐
│   Stop Marker Components    │
└─────────────────────────────┘

    [Sequence Badge: #2]
         ↓
    ┌─────────┐
    │    📍   │  ← Stop Marker (36px)
    │         │     • White background
    └─────────┘     • Orange border (3px)
         │          • Orange shadow
         │          • Location pin icon
    ┌─────────┐
    │ 🚌 STOP │  ← Label
    │  NAME   │     • White background
    └─────────┘     • Orange border (2px)
                    • Bus icon + text
```

### Color Palette
```
Primary Colors:
├── Bus Stop Orange:  #F59E0B  🟠
├── Start Pin Green:  #10B981  🟢
├── End Pin Red:      #EF4444  🔴
├── Badge Red:        #DC2626  🔴
└── Background White: #FFFFFF  ⚪

Shadow Colors:
├── Orange Shadow:    #F59E0B (40% opacity)
├── Black Shadow:     #000000 (15% opacity)
└── Badge Shadow:     #DC2626 (40% opacity)
```

### Size Hierarchy
```
Component Sizes (in pixels):
─────────────────────────────
Start/End Pins:     48px  ████████████
Bus Stop Markers:   36px  █████████
Stop Labels:        ~80px ████████████████
Sequence Badge:     20px  ████
Icons:
  • Stop Icon:      20px
  • Pin Icons:      24-26px
  • Label Icon:     12px
```

### Animation Timing
```
Pulse Animation Cycle (1500ms total):
─────────────────────────────────────

0ms        750ms      1500ms
 │           │           │
 ▼           ▼           ▼
Scale:    1.0 ──▶ 1.3 ──▶ 1.0
Opacity:  0.2 ──▶ 0.0 ──▶ 0.2

Easing: ease-in-out (smooth motion)
Loop: Infinite
```

## Component Breakdown

### 1. Bus Stop Marker
```javascript
Size: 36x36px
Shape: Circle
Border: 3px solid #F59E0B
Background: #FFFFFF
Icon: location pin (20px)
Shadow: 0 3px 6px rgba(245,158,11,0.4)
Elevation: 8
```

### 2. Stop Label
```javascript
Min Width: 60px
Max Width: 120px
Padding: 10px (H) × 5px (V)
Border: 2px solid #F59E0B
Border Radius: 12px
Background: #FFFFFF
Font: 11px, weight 700
Letter Spacing: 0.3px
Shadow: 0 2px 4px rgba(0,0,0,0.15)
Elevation: 5
```

### 3. Sequence Badge
```javascript
Size: 20x20px
Shape: Circle
Position: Top-right of marker (-4px, -4px)
Border: 2px solid #FFFFFF
Background: #DC2626
Font: 10px, weight 800
Color: #FFFFFF
Shadow: 0 2px 3px rgba(220,38,38,0.4)
Elevation: 5
Z-Index: 10
```

### 4. Start Pin
```javascript
Size: 48x48px
Shape: Circle
Border: 4px solid #FFFFFF
Background: #10B981
Icon: location (26px)
Label Background: #10B981
Label Border: 2.5px solid #FFFFFF
Shadow: 0 5px 10px rgba(16,185,129,0.4)
Elevation: 12
```

### 5. End Pin
```javascript
Size: 48x48px
Shape: Circle
Border: 4px solid #FFFFFF
Background: #EF4444
Icon: flag (24px)
Label Background: #EF4444
Label Border: 2.5px solid #FFFFFF
Shadow: 0 5px 10px rgba(239,68,68,0.4)
Elevation: 12
```

## Layout Examples

### Single Stop Display
```
     [2]
  ┌────────┐
  │   📍   │ ← Animated pulse
  └────────┘
  ┌────────┐
  │🚌 CUBAO│
  └────────┘
```

### Multiple Stops on Route
```
Route: Dasmarinas → Cubao

START
  🟢  ← Dasmarinas
  ┊
  [1]
  📍  ← Carmona Exit
  ┊
  [2]
  📍  ← Centennial
  ┊
  [3]
  📍  ← Eastwood
  ┊
  🔴  ← Cubao
END
```

### Map View (Top-down)
```
┌───────────────────────────────────┐
│                                   │
│    [START] 🟢 Dasmarinas         │
│         ┊                         │
│         ┊    [1] 📍 Carmona Exit │
│         ┊                         │
│    [2] 📍 ─────── Centennial     │
│                                   │
│              [3] 📍 Eastwood     │
│                   ┊               │
│                   ┊               │
│            [END] 🔴 Cubao        │
│                                   │
└───────────────────────────────────┘
```

## Responsive Scaling

### Phone (Standard)
- Base sizes as specified
- All animations enabled
- Full shadow effects

### Tablet
- 1.2x scale factor
- All features maintained
- Enhanced touch targets

### Small Phones
- 0.9x scale factor
- Reduced shadows (performance)
- Simplified animations

## Accessibility Features

### Visual
- High contrast colors (Orange on white)
- Large touch targets (36px minimum)
- Clear icons and labels

### Text
- Readable font sizes (11-12px)
- Bold weights (700-800)
- Good letter spacing

### Color Blindness Support
- Orange/Green/Red scheme distinguishable
- Icons provide additional context
- Numbers for sequence (not just colors)

## Implementation Notes

### React Native Styles
```javascript
// Stop Marker
stopMarker: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#FFFFFF',
  borderWidth: 3,
  borderColor: '#F59E0B',
  shadowColor: '#F59E0B',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.4,
  shadowRadius: 6,
  elevation: 8,
}

// Stop Label
stopMarkerLabel: {
  paddingHorizontal: 10,
  paddingVertical: 5,
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#F59E0B',
}

// Sequence Badge
stopSequenceBadge: {
  position: 'absolute',
  top: -4,
  right: -4,
  width: 20,
  height: 20,
  borderRadius: 10,
  backgroundColor: '#DC2626',
  borderWidth: 2,
  borderColor: '#FFFFFF',
}
```

### Animation Code
```javascript
// Pulse Animation
Animated.loop(
  Animated.parallel([
    Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.3,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]),
  ])
).start();
```

## Usage Guidelines

### When to Show Sequence Badges
✅ Show when:
- Displaying a specific route
- Stop order is important
- Multiple stops visible

❌ Hide when:
- Zoomed out too far
- Too many stops (cluttered)
- User only browsing

### Animation Performance
- Enable on WiFi/good connection
- Reduce on low battery
- Disable in power-save mode
- Limit concurrent animations

### Label Display
- Always show for selected stop
- Show on hover/long-press
- Auto-hide when zoomed out
- Show top 5 nearest stops

## Design Principles

1. **Clarity**: Information should be instantly understandable
2. **Hierarchy**: Most important elements are most prominent
3. **Consistency**: Same patterns throughout the app
4. **Accessibility**: Usable by everyone
5. **Performance**: Smooth animations, no lag
6. **Scalability**: Works with 5 or 50 stops

## Comparison with Other Apps

### Google Maps
- Similar size markers
- Our orange vs their blue
- We add sequence numbers
- Our animations more subtle

### Apple Maps
- Similar pin style
- Our labels more prominent
- We add bus icon in label
- Better color coding

### Transit Apps
- Similar approach
- Our design more modern
- Better animation effects
- Clearer hierarchy

---

**Design System**: Navi-GO  
**Platform**: React Native  
**Last Updated**: November 26, 2025


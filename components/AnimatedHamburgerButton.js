import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import { colors, radius, shadows } from '../styles/uiTheme';

/**
 * Animated hamburger button with modern visual treatment.
 * - Clean three-line icon that stays left-aligned
 * - Press scale feedback with spring
 * - Subtle pulse when closed
 * - Android ripple + iOS-friendly scale feedback
 */
export default function AnimatedHamburgerButton({
  isOpen,
  onToggle,
  style,
}) {
  const progress = useRef(new Animated.Value(isOpen ? 1 : 0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  // Animate container/background based on drawer open state
  useEffect(() => {
    Animated.timing(progress, {
      toValue: isOpen ? 1 : 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [isOpen, progress]);

  // Subtle pulse loop when closed
  useEffect(() => {
    let pulseAnimation;
    if (!isOpen) {
      pulse.setValue(0);
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 0,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.delay(1200),
        ]),
      );
      pulseAnimation.start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(0);
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
    };
  }, [isOpen, pulse]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.95,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePress = () => {
    if (onToggle) {
      onToggle();
    }
  };

  // Derived animated values
  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.06],
  });

  const containerScale = Animated.multiply(pressScale, pulseScale);

  const activeBackground = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.18)', '#FFFFFF'],
  });

  const shadowOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.35],
  });

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      android_ripple={{
        color: 'rgba(255,255,255,0.25)',
        borderless: true,
      }}
      style={({ pressed }) => [
        styles.pressableHitSlop,
        style,
        pressed && Platform.OS === 'ios' && { opacity: 0.9 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
      accessibilityHint="Opens the Metro NaviGo navigation drawer"
    >
      <Animated.View
        style={[
          styles.buttonContainer,
          {
            backgroundColor: activeBackground,
            transform: [{ scale: containerScale }],
            shadowOpacity: shadowOpacity,
          },
        ]}
      >
        {/* Three-line hamburger, fixed and left-aligned */}
        <View style={styles.linesContainer}>
          <View style={styles.line} />
          <View style={styles.line} />
          <View style={styles.line} />
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableHitSlop: {
    // Ensures comfortable touch target (>= 44x44)
    padding: 4,
  },
  buttonContainer: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.floating,
    shadowColor: colors.brand,
    // shadowOpacity overridden via animation
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  linesContainer: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  line: {
    width: 14,
    height: 2,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});



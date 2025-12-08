import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';

const { width } = Dimensions.get('window');

/**
 * Consistent modal component for notifications, confirmations, and success messages
 * 
 * @param {boolean} visible - Controls modal visibility
 * @param {string} title - Modal title
 * @param {string} message - Modal message text
 * @param {string} buttonText - Text for the action button (default: "OK") - used when buttons prop is not provided
 * @param {function} onPress - Callback when button is pressed - used when buttons prop is not provided
 * @param {array} buttons - Optional array of button objects: [{ text: string, onPress: function, style?: 'default' | 'cancel' | 'success' }]
 * @param {string} icon - Optional icon name (e.g., 'checkmark-circle', 'alert-circle', 'information-circle')
 * @param {string} iconColor - Optional icon color (defaults to brand color, or success color for success type)
 * @param {string} type - Optional type: 'success', 'error', 'warning', 'info', or 'default'
 */
export default function NotificationModal({
  visible,
  title,
  message,
  buttonText = 'OK',
  onPress,
  buttons,
  icon,
  iconColor,
  type = 'default',
}) {
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  // Use buttons array if provided, otherwise use single button
  const displayButtons = (buttons && Array.isArray(buttons) && buttons.length > 0)
    ? buttons 
    : [{ text: buttonText, onPress: handlePress, style: type === 'success' ? 'success' : 'default' }];

  // Determine icon and colors based on type
  const getIconName = () => {
    if (icon) return icon;
    switch (type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'alert-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      default:
        return null;
    }
  };

  const getIconColor = () => {
    if (iconColor) return iconColor;
    switch (type) {
      case 'success':
        return colors.brand; // Use brand orange for success
      case 'error':
        return colors.danger;
      case 'warning':
        return '#F59E0B';
      case 'info':
        return colors.info;
      default:
        return colors.brand;
    }
  };

  const iconName = getIconName();
  const iconColorValue = getIconColor();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handlePress}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          {iconName && (
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: iconColorValue }]}>
                <Ionicons 
                  name={iconName} 
                  size={48} 
                  color="#FFFFFF" 
                />
              </View>
            </View>
          )}

          {/* Title */}
          {title && (
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          )}

          {/* Message */}
          {message && (
            <Text style={styles.message} numberOfLines={10}>
              {message}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {displayButtons.map((button, index) => {
              const buttonStyle = button.style || 'default';
              const isSuccess = buttonStyle === 'success' || (type === 'success' && buttonStyle === 'default');
              
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.button,
                    displayButtons.length > 1 && styles.buttonMulti,
                    buttonStyle === 'cancel' && styles.buttonCancel,
                    isSuccess && styles.buttonSuccess,
                  ]}
                  onPress={() => {
                    if (button.onPress) {
                      button.onPress();
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.buttonText,
                    buttonStyle === 'cancel' && styles.buttonTextCancel,
                  ]}>
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    width: Math.min(width - spacing.xl * 2, 340),
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 24,
    paddingHorizontal: spacing.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    alignSelf: 'stretch',
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 12,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xxl * 1.5,
    minWidth: 120,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    shadowColor: colors.brand,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonMulti: {
    flex: 1,
    minWidth: 100,
  },
  buttonCancel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonSuccess: {
    backgroundColor: colors.brand, // Use brand orange for success buttons
    shadowColor: colors.brand,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonTextCancel: {
    color: colors.textSecondary,
  },
});


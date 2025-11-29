import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/uiTheme';

const { width } = Dimensions.get('window');

const SimpleDrawer = ({
  visible,
  onClose,
  currentRole = 'passenger',
  onRoleChange,
  navigation,
}) => {
  const menuItems = [
    {
      title: 'Passenger Mode',
      icon: 'people',
      screen: 'PassengerTabs',
      role: 'passenger',
    },
    {
      title: 'Driver Mode',
      icon: 'car',
      screen: 'DriverTabs',
      role: 'driver',
    },
    {
      title: 'Route Search',
      icon: 'search',
      screen: 'RouteSearch',
      role: 'passenger',
    },
    {
      title: 'Help & Support',
      icon: 'help-circle',
      screen: 'Help',
      role: 'both',
    },
  ];

  const drawerProgress = useRef(new Animated.Value(0)).current;
  const [renderVisible, setRenderVisible] = useState(visible);
  const menuItemAnimations = useRef(
    menuItems.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    if (visible) {
      setRenderVisible(true);
      // Open animations
      Animated.parallel([
        Animated.spring(drawerProgress, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 80,
        }),
        Animated.stagger(
          70,
          menuItemAnimations.map(anim =>
            Animated.spring(anim, {
              toValue: 1,
              useNativeDriver: true,
              friction: 8,
              tension: 80,
            }),
          ),
        ),
      ]).start();
    } else if (renderVisible) {
      // Close animations
      Animated.parallel([
        Animated.timing(drawerProgress, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.parallel(
          menuItemAnimations.map(anim =>
            Animated.timing(anim, {
              toValue: 0,
              duration: 150,
              easing: Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ),
        ),
      ]).start(({ finished }) => {
        if (finished) {
          setRenderVisible(false);
        }
      });
    }
  }, [visible, renderVisible, drawerProgress, menuItemAnimations]);

  const handleMenuPress = (screenName, role) => {
    if (role === 'driver' && currentRole !== 'driver') {
      // Switch to driver mode and trigger driver login
      onRoleChange('driver');
      // The driver login will be handled by the main app component
    } else if (role === 'passenger' && currentRole !== 'passenger') {
      // Switch to passenger mode first
      onRoleChange('passenger');
    }
    
    // Navigate to the screen
    navigation.navigate(screenName);
    onClose();
  };

  const drawerTranslateX = drawerProgress.interpolate({
    inputRange: [0, 1],
    // Start fully off-screen to the left, slide to 0 (visible)
    outputRange: [-width * 0.92, 0],
  });

  const backdropOpacity = drawerProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (!renderVisible) {
    return null;
  }

  return (
    <Modal
      visible={renderVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.drawer,
            {
              transform: [{ translateX: drawerTranslateX }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
              <Ionicons name="bus" size={28} color={colors.brand} />
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.appName} numberOfLines={1}>
                  Metro NaviGo
                </Text>
                <Text style={styles.appSubtitle} numberOfLines={1}>
                  Public Transit
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Scrollable Content */}
          <ScrollView 
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* Current Mode Status */}
            <View style={styles.statusContainer}>
              <View style={styles.statusCard}>
                <View style={styles.statusIconContainer}>
                  <Ionicons 
                    name={currentRole === 'passenger' ? 'people' : 'car'} 
                    size={22} 
                    color="#FFFFFF" 
                  />
                </View>
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusLabel} numberOfLines={1}>
                    Current Mode
                  </Text>
                  <Text style={styles.statusValue} numberOfLines={1}>
                    {currentRole === 'passenger' ? 'Passenger' : 'Driver'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Section Divider */}
            <View style={styles.sectionDivider} />

            {/* Menu Items */}
            <View style={styles.menuContainer}>
              <Text style={styles.menuSectionTitle}>Navigation</Text>
              {menuItems.map((item, index) => {
                const isActive = currentRole === item.role || item.role === 'both';
                const itemAnim = menuItemAnimations[index];
                const itemTranslateX = itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-24, 0],
                });
                const itemOpacity = itemAnim;
                const itemScale = itemAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.98, 1],
                });
                return (
                  <Animated.View
                    key={index}
                    style={{
                      opacity: itemOpacity,
                      transform: [{ translateX: itemTranslateX }, { scale: itemScale }],
                    }}
                  >
                    <TouchableOpacity
                      style={[styles.menuItem, isActive && styles.menuItemActive]}
                      onPress={() => handleMenuPress(item.screen, item.role)}
                      activeOpacity={0.7}
                    >
                      <Animated.View
                        style={[
                          styles.menuIconContainer,
                          isActive && styles.menuIconContainerActive,
                          {
                            transform: [
                              {
                                scale: itemAnim.interpolate({
                                  inputRange: [0, 1],
                                  outputRange: [0.9, 1],
                                }),
                              },
                            ],
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.icon}
                          size={22}
                          color={isActive ? colors.brand : '#6B7280'}
                        />
                      </Animated.View>
                      <Text
                        style={[styles.menuText, isActive && styles.menuTextActive]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.title}
                      </Text>
                      <View style={{ flexShrink: 0, marginLeft: 4 }}>
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={isActive ? colors.brand : '#9CA3AF'}
                        />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Version 1.0.0</Text>
          </View>
        </Animated.View>
        
        {/* Tap on the dimmed area to close */}
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdropTouchable} />
        </TouchableWithoutFeedback>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  backdropTouchable: {
    flex: 1,
  },
  drawer: {
    width: width * 0.92,
    backgroundColor: '#FFFFFF',
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 60,
    backgroundColor: colors.brand,
    borderBottomWidth: 0,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
    minWidth: 0,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexShrink: 0,
  },
  logoTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.6,
    fontFamily: 'System',
    lineHeight: 28,
  },
  appSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.95)',
    fontWeight: '500',
    marginTop: 3,
    fontFamily: 'System',
    letterSpacing: 0.1,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 8,
  },
  statusContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  statusTextContainer: {
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  statusLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 3,
    fontFamily: 'System',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'System',
    letterSpacing: -0.3,
    lineHeight: 20,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
    marginVertical: 4,
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  menuSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    minHeight: 56,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  menuItemActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  menuIconContainerActive: {
    backgroundColor: '#FEF3C7',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'System',
    letterSpacing: -0.2,
    lineHeight: 20,
    marginRight: 4,
  },
  menuTextActive: {
    color: '#111827',
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
});

export default SimpleDrawer;

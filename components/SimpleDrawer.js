import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const SimpleDrawer = ({ 
  visible, 
  onClose, 
  currentRole = 'passenger', 
  onRoleChange,
  navigation 
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.drawer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoIcon}>
                <Ionicons name="bus" size={28} color="#F59E0B" />
              </View>
              <View style={styles.logoTextContainer}>
                <Text style={styles.appName}>Metro NaviGo</Text>
                <Text style={styles.appSubtitle}>Public Transit</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Current Mode Status */}
          <View style={styles.statusContainer}>
            <View style={styles.statusCard}>
              <View style={styles.statusIconContainer}>
                <Ionicons 
                  name={currentRole === 'passenger' ? 'people' : 'car'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusLabel}>Current Mode</Text>
                <Text style={styles.statusValue}>
                  {currentRole === 'passenger' ? 'Passenger' : 'Driver'}
                </Text>
              </View>
            </View>
          </View>

          {/* Menu Items */}
          <View style={styles.menuContainer}>
            <Text style={styles.menuSectionTitle}>Navigation</Text>
            {menuItems.map((item, index) => {
              const isActive = currentRole === item.role || item.role === 'both';
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.menuItem, isActive && styles.menuItemActive]}
                  onPress={() => handleMenuPress(item.screen, item.role)}
                >
                  <View style={[styles.menuIconContainer, isActive && styles.menuIconContainerActive]}>
                    <Ionicons 
                      name={item.icon} 
                      size={22} 
                      color={isActive ? '#F59E0B' : '#6B7280'} 
                    />
                  </View>
                  <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
                    {item.title}
                  </Text>
                  <Ionicons 
                    name="chevron-forward" 
                    size={16} 
                    color={isActive ? '#F59E0B' : '#9CA3AF'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={styles.footerDivider} />
            <Text style={styles.footerText}>Version 1.0.0</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  drawer: {
    width: width * 0.85,
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
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#f59e0b',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  logoTextContainer: {
    flex: 1,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    fontFamily: 'System',
  },
  appSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
    marginTop: 2,
    fontFamily: 'System',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statusIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
    fontFamily: 'System',
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  menuContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    fontFamily: 'System',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingVertical: 14,
    marginBottom: 4,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  menuItemActive: {
    backgroundColor: '#FFF9E6',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFF9E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuIconContainerActive: {
    backgroundColor: '#FFF9E6',
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
  menuTextActive: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    backgroundColor: '#FFFFFF',
  },
  footerDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  footerText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
});

export default SimpleDrawer;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, radius, shadows } from '../styles/uiTheme';

const { width } = Dimensions.get('window');

export default function DriverProfileScreen({ navigation }) {
  const [driver, setDriver] = useState(null);
  const [currentBus, setCurrentBus] = useState(null);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);

  // Get data from Supabase context
  const { 
    supabase,
    drivers, 
    buses, 
    schedules, 
    driverBusAssignments,
    loading, 
    error, 
    refreshData,
    refreshDriverData 
  } = useSupabase();

  // Get auth context
  const { signOut } = useAuth();

  useEffect(() => {
    // Load current driver from AsyncStorage session
    const loadCurrentDriver = async () => {
      try {
        console.log('🔍 Loading driver profile...');
        console.log('📊 Available drivers:', drivers.length);
        console.log('🚌 Available buses:', buses.length);
        console.log('🔗 Available assignments:', driverBusAssignments.length);
        
        // If no drivers loaded, try to refresh driver data
        if (drivers.length === 0) {
          console.log('⚠️ No drivers found, refreshing driver data...');
          await refreshDriverData();
          return; // Exit early, will retry on next render
        }
        
        const driverSession = await AsyncStorage.getItem('driverSession');
        console.log('💾 Driver session:', driverSession ? 'Found' : 'Not found');
        
        if (driverSession) {
          const sessionData = JSON.parse(driverSession);
          console.log('👤 Session data:', sessionData);
          const currentDriver = drivers.find(d => d.id === sessionData.driver_id);
          console.log('🔍 Found driver:', currentDriver ? 'Yes' : 'No');
          setDriver(currentDriver);
          
          if (currentDriver) {
            setEditForm({
              name: currentDriver.name,
              phone: currentDriver.phone || '',
              email: currentDriver.email,
            });
            
            // Find assigned bus for this driver
            // CRITICAL: Only find active assignments
            const assignment = driverBusAssignments.find(assignment => 
              assignment.is_active === true &&
              (assignment.drivers?.id === currentDriver.id || 
               assignment.driver_id === currentDriver.id)
            );
            
            console.log('🔍 Looking for assignment for driver:', currentDriver.id);
            console.log('📋 Available assignments:', driverBusAssignments.length);
            console.log('📋 Sample assignment:', driverBusAssignments[0]);
            
            if (assignment) {
              console.log('✅ Assignment found:', assignment);
              // Use the bus data from the assignment (which includes nested route info)
              if (assignment.buses) {
                setCurrentBus(assignment.buses);
                console.log('✅ Assigned bus found from assignments:', assignment.buses);
              } else if (assignment.bus_id) {
                // Fallback: Find bus by bus_id from assignment
                console.log('⚠️ Assignment exists but bus data missing. Looking up bus by bus_id:', assignment.bus_id);
                const foundBus = buses.find(bus => bus.id === assignment.bus_id);
                if (foundBus) {
                  setCurrentBus(foundBus);
                  console.log('✅ Found bus by assignment bus_id:', foundBus);
                } else {
                  console.log('❌ Bus not found even with assignment bus_id:', assignment.bus_id);
                }
              } else {
                console.log('❌ Assignment found but no bus_id or bus data');
              }
            } else {
              console.log('❌ No assignment found in loaded data. Trying direct database query...');
              
              // Fallback 1: Query database directly for assignment
              try {
                const { data: directAssignment, error: assignmentError } = await supabase
                  .from('driver_bus_assignments')
                  .select(`
                    id,
                    driver_id,
                    bus_id,
                    is_active,
                    buses:bus_id(
                      bus_number,
                      name,
                      route_id,
                      id,
                      status,
                      routes:route_id(id, route_number, name)
                    )
                  `)
                  .eq('driver_id', currentDriver.id)
                  .eq('is_active', true)
                  .order('assigned_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (!assignmentError && directAssignment) {
                  console.log('✅ Found assignment via direct query:', directAssignment);
                  if (directAssignment.buses) {
                    setCurrentBus(directAssignment.buses);
                    console.log('✅ Assigned bus found via direct query:', directAssignment.buses);
                  } else if (directAssignment.bus_id) {
                    const foundBus = buses.find(bus => bus.id === directAssignment.bus_id);
                    if (foundBus) {
                      setCurrentBus(foundBus);
                      console.log('✅ Found bus by direct query bus_id:', foundBus);
                    }
                  }
                } else {
                  console.log('⚠️ Direct query also found no assignment:', assignmentError?.message);
                  
                  // Fallback 2: Check buses table directly
                  const busFromBusesTable = buses.find(bus => bus.driver_id === currentDriver.id);
                  if (busFromBusesTable) {
                    setCurrentBus(busFromBusesTable);
                    console.log('✅ Assigned bus found from buses table:', busFromBusesTable);
                  } else {
                    console.log('❌ No bus assignment found for driver:', currentDriver.id);
                    console.log('📋 Available buses with drivers:', buses.filter(b => b.driver_id).map(b => ({ id: b.id, name: b.name, driver_id: b.driver_id })));
                  }
                }
              } catch (queryError) {
                console.error('❌ Error querying assignment directly:', queryError);
              }
            }
          }
        } else {
          // Fallback to first driver if no session
          console.log('⚠️ No session found, using first driver');
          const currentDriver = drivers[0];
          setDriver(currentDriver);
          if (currentDriver) {
            setEditForm({
              name: currentDriver.name,
              phone: currentDriver.phone || '',
              email: currentDriver.email,
            });
            
            // Find assigned bus for this driver
            // CRITICAL: Only find active assignments
            const assignment = driverBusAssignments.find(assignment => 
              assignment.is_active === true &&
              (assignment.drivers?.id === currentDriver.id || 
               assignment.driver_id === currentDriver.id)
            );
            
            if (assignment) {
              console.log('✅ Assignment found:', assignment);
              if (assignment.buses) {
                setCurrentBus(assignment.buses);
                console.log('✅ Assigned bus found from assignments:', assignment.buses);
              } else if (assignment.bus_id) {
                // Fallback: Find bus by bus_id from assignment
                const foundBus = buses.find(bus => bus.id === assignment.bus_id);
                if (foundBus) {
                  setCurrentBus(foundBus);
                  console.log('✅ Found bus by assignment bus_id:', foundBus);
                }
              }
            } else {
              // Fallback: Check buses table directly
              const busFromBusesTable = buses.find(bus => bus.driver_id === currentDriver.id);
              if (busFromBusesTable) {
                setCurrentBus(busFromBusesTable);
                console.log('✅ Assigned bus found from buses table:', busFromBusesTable);
              } else {
                console.log('❌ No bus assignment found for driver:', currentDriver.id);
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Error loading driver session:', error);
        // Fallback to first driver
        const currentDriver = drivers[0];
        setDriver(currentDriver);
        if (currentDriver) {
          setEditForm({
            name: currentDriver.name,
            phone: currentDriver.phone || '',
            email: currentDriver.email,
          });
        }
      }
    };

    // Load when we have drivers - assignments might be empty but we can still check buses table
    if (drivers.length > 0) {
      loadCurrentDriver();
    } else {
      console.log('⚠️ Waiting for drivers to load...');
    }
  }, [drivers, buses, driverBusAssignments]);

  useEffect(() => {
    if (driver) {
      calculatePerformanceStats();
    }
  }, [driver, schedules, buses]);

  const calculatePerformanceStats = () => {
    if (!driver) return;

    const driverBuses = buses.filter(bus => bus.driver_id === driver.id);
    const driverSchedules = schedules.filter(schedule => 
      driverBuses.some(bus => bus.id === schedule.bus_id)
    );

    const today = new Date();
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const completedTrips = driverSchedules.filter(s => s.status === 'completed');
    const thisWeekTrips = completedTrips.filter(s => 
      new Date(s.departure_time) >= thisWeek
    );
    const thisMonthTrips = completedTrips.filter(s => 
      new Date(s.departure_time) >= thisMonth
    );

    const totalPassengers = completedTrips.reduce((sum, trip) => 
      sum + (trip.passengers_count || 0), 0
    );
    const totalDistance = completedTrips.reduce((sum, trip) => 
      sum + (trip.distance || 0), 0
    );

    const onTimePercentage = completedTrips.length > 0 ? 
      (completedTrips.filter(trip => {
        const scheduledTime = new Date(trip.departure_time);
        const actualTime = new Date(trip.actual_departure_time || trip.departure_time);
        const timeDiff = Math.abs(actualTime - scheduledTime) / (1000 * 60); // minutes
        return timeDiff <= 5; // 5 minutes tolerance
      }).length / completedTrips.length) * 100 : 0;

    setPerformanceStats({
      totalTrips: completedTrips.length,
      thisWeekTrips: thisWeekTrips.length,
      thisMonthTrips: thisMonthTrips.length,
      totalPassengers,
      totalDistance: totalDistance.toFixed(1),
      onTimePercentage: onTimePercentage.toFixed(1),
      averageRating: 4.7, // Mock data - would come from feedback table
      currentBus: driverBuses.find(bus => bus.status === 'active')?.bus_number || 'N/A',
    });
  };

  const handleEditProfile = () => {
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    // In real app, this would update the database
    Alert.alert('Profile Updated', 'Your profile has been updated successfully!');
    setShowEditModal(false);
    setIsEditing(false);
  };

  const handleChangePassword = () => {
    Alert.alert('Change Password', 'Password change feature coming soon!');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            try {
              // Clear driver session from AsyncStorage
              await AsyncStorage.removeItem('driverSession');
              // Sign out from auth context
              await signOut();
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleMenuPress = () => {
    // Drawer removed
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.brand} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </View>
    );
  }

  if (error || !driver) {
    const errorMessage = error 
      ? `Database Error: ${error}` 
      : drivers.length === 0 
        ? 'No drivers found in database' 
        : 'Driver profile not found';
    
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color={colors.danger} />
          <Text style={styles.errorText}>Failed to load profile</Text>
          <Text style={styles.errorSubtext}>{errorMessage}</Text>
          <Text style={styles.errorSubtext}>
            Available drivers: {drivers.length}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshDriverData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Driver Profile</Text>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBackground}>
              <Ionicons name="person-circle" size={80} color={colors.brand} />
            </View>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.licenseNumber}>License: {driver.license_number}</Text>
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusBadge,
                driver.status === 'active' ? styles.statusBadgeActive : styles.statusBadgeInactive
              ]}>
                <View style={[
                  styles.statusDot,
                  driver.status === 'active' ? styles.statusDotActive : styles.statusDotInactive
                ]} />
                <Text style={[
                  styles.statusText,
                  driver.status === 'active' ? styles.statusTextActive : styles.statusTextInactive
                ]}>
                  {driver.status === 'active' ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create-outline" size={20} color={colors.brand} />
          </TouchableOpacity>
        </View>

        {/* Contact Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="call" size={18} color={colors.brand} />
              </View>
              <Text style={styles.infoText}>{driver.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="mail" size={18} color={colors.brand} />
              </View>
              <Text style={styles.infoText}>{driver.email || 'Not provided'}</Text>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="car" size={18} color={colors.brand} />
              </View>
              <Text style={styles.infoText}>
                Current Bus: {currentBus ? `${currentBus.bus_number || currentBus.name || 'Bus'}`.trim() : 'N/A'}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Statistics */}
        {performanceStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialCommunityIcons name="car-multiple" size={24} color={colors.success} />
                </View>
                <Text style={styles.statValue}>{performanceStats.totalTrips}</Text>
                <Text style={styles.statLabel}>Total Trips</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
                  <MaterialCommunityIcons name="account-group" size={24} color={colors.info} />
                </View>
                <Text style={styles.statValue}>{performanceStats.totalPassengers}</Text>
                <Text style={styles.statLabel}>Passengers</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.brandSoft }]}>
                  <MaterialCommunityIcons name="speedometer" size={24} color={colors.brand} />
                </View>
                <Text style={styles.statValue}>{performanceStats.totalDistance} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#F3E8FF' }]}>
                  <MaterialCommunityIcons name="clock-check" size={24} color="#9333EA" />
                </View>
                <Text style={styles.statValue}>{performanceStats.onTimePercentage}%</Text>
                <Text style={styles.statLabel}>On Time</Text>
              </View>
            </View>
          </View>
        )}

        {/* Weekly Performance */}
        {performanceStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>This Week</Text>
            <View style={styles.weeklyStats}>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>{performanceStats.thisWeekTrips}</Text>
                <Text style={styles.weeklyLabel}>Trips Completed</Text>
              </View>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>{performanceStats.thisMonthTrips}</Text>
                <Text style={styles.weeklyLabel}>This Month</Text>
              </View>
              <View style={styles.weeklyStat}>
                <Text style={styles.weeklyValue}>{performanceStats.averageRating}</Text>
                <Text style={styles.weeklyLabel}>Rating</Text>
              </View>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>
          <View style={styles.actionsList}>
            <TouchableOpacity style={styles.actionItem} onPress={handleChangePassword}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="key" size={20} color={colors.brand} />
              </View>
              <Text style={styles.actionText}>Change Password</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="notifications" size={20} color={colors.brand} />
              </View>
              <Text style={styles.actionText}>Notification Settings</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIconContainer}>
                <Ionicons name="help-circle" size={20} color={colors.brand} />
              </View>
              <Text style={styles.actionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionItem, styles.actionItemDanger]} onPress={handleLogout}>
              <View style={[styles.actionIconContainer, styles.actionIconContainerDanger]}>
                <Ionicons name="log-out" size={20} color={colors.danger} />
              </View>
              <Text style={[styles.actionText, styles.actionTextDanger]}>Logout</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveProfile}>
              <Text style={styles.modalSave}>Save</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(text) => setEditForm({...editForm, name: text})}
                placeholder="Enter your full name"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.phone}
                onChangeText={(text) => setEditForm({...editForm, phone: text})}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.email}
                onChangeText={(text) => setEditForm({...editForm, email: text})}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerContainer: {
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  profileHeader: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.floating,
  },
  avatarContainer: {
    marginRight: spacing.xl,
  },
  avatarBackground: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.brandSoftStrong,
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontFamily: 'System',
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  licenseNumber: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '500',
    fontFamily: 'System',
  },
  driverStatus: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
  },
  statusContainer: {
    marginTop: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
  },
  statusBadgeActive: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  statusDotInactive: {
    backgroundColor: colors.danger,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  statusTextActive: {
    color: '#065F46',
  },
  statusTextInactive: {
    color: '#991B1B',
  },
  editButton: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.brandSoftStrong,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceSubtle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderMuted,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    fontWeight: '500',
    fontFamily: 'System',
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  statCard: {
    width: (width - spacing.xl * 2 - spacing.md) / 2,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  statIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'System',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  weeklyStats: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  weeklyStat: {
    flex: 1,
    alignItems: 'center',
  },
  weeklyValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.brand,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  weeklyLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '600',
    fontFamily: 'System',
  },
  actionsList: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    overflow: 'hidden',
    ...shadows.card,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconContainerDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    fontSize: 16,
    color: colors.textPrimary,
    marginLeft: spacing.md,
    flex: 1,
    fontWeight: '500',
    fontFamily: 'System',
  },
  actionTextDanger: {
    color: colors.danger,
    fontWeight: '600',
  },
  actionItemDanger: {
    borderBottomWidth: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxxl,
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.danger,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
  retryButton: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: radius.lg,
    ...shadows.floating,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
    ...shadows.card,
  },
  modalCancel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  modalSave: {
    fontSize: 16,
    color: colors.brand,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContent: {
    flex: 1,
    padding: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    fontFamily: 'System',
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    fontFamily: 'System',
    color: colors.textPrimary,
  },
});

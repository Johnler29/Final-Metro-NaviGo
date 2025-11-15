import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  FlatList,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSupabase } from '../contexts/SupabaseContext';
import { useDrawer } from '../contexts/DrawerContext';
import CapacityStatusModal from '../components/CapacityStatusModal';
import AlarmModal from '../components/AlarmModal';
import { supabase } from '../lib/supabase';
import { Vibration } from 'react-native';

const { width } = Dimensions.get('window');

// Simple UUID generator for React Native
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function DriverHomeScreen({ navigation }) {
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [currentTrip, setCurrentTrip] = useState(null);
  const [passengerCount, setPassengerCount] = useState(0);
  const [tripStartTime, setTripStartTime] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showPassengerModal, setShowPassengerModal] = useState(false);
  const [showCapacityModal, setShowCapacityModal] = useState(false);
  const [currentCapacity, setCurrentCapacity] = useState(0);
  const [currentBus, setCurrentBus] = useState(null);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [showAlarmModal, setShowAlarmModal] = useState(false);
  const [pingNotifications, setPingNotifications] = useState([]);
  const [showPingModal, setShowPingModal] = useState(false);
  const [unreadPingCount, setUnreadPingCount] = useState(0);

  // Get data from Supabase context
  const { 
    supabase,
    buses, 
    routes, 
    drivers, 
    schedules, 
    driverBusAssignments,
    loading, 
    error, 
    refreshData,
    getDriverSchedules,
    getDriverBuses,
    updateDriverStatus,
    startTrip,
    endTrip,
    updatePassengerCount,
    reportEmergency,
    reportMaintenanceIssue,
    updateBusCapacityStatus,
    getBusCapacityStatus,
    startDriverSession,
    endDriverSession,
    updateBusLocation,
    getBusPingNotifications,
    acknowledgePing,
    completePing
  } = useSupabase();

  // Get drawer context
  const { openDrawer } = useDrawer();

  // Load current driver information on component mount
  useEffect(() => {
    const loadCurrentDriver = async () => {
      try {
        console.log('🔍 Loading current driver...');
        const driverSession = await AsyncStorage.getItem('driverSession');
        console.log('📱 Driver session from storage:', driverSession ? 'Found' : 'Not found');
        
        if (driverSession) {
          const session = JSON.parse(driverSession);
          console.log('👤 Session data:', session);
          console.log('🔍 Available drivers:', drivers.length);
          
          const driver = drivers.find(d => d.id === session.driver_id);
          if (driver) {
            setCurrentDriver(driver);
            console.log('✅ Current driver loaded:', driver.name, driver.id);
            
            // Find assigned bus for this driver using driver-bus assignments
            console.log('🔍 Available assignments:', driverBusAssignments.length);
            const assignment = driverBusAssignments.find(assignment => assignment.drivers?.id === driver.id);
            
            if (assignment) {
              console.log('✅ Assignment found:', assignment);
              // Use the bus data from the assignment (which includes nested route info)
              if (assignment.buses) {
                setCurrentBus(assignment.buses);
                console.log('✅ Assigned bus found:', assignment.buses.bus_number, assignment.buses.id);
              } else {
                console.log('❌ Bus data not found in assignment');
                // Try to find any available bus as fallback
                const availableBus = buses.find(bus => bus.status === 'in_service' && bus.tracking_status === 'active');
                if (availableBus) {
                  setCurrentBus(availableBus);
                  console.log('🔄 Using fallback bus:', availableBus.bus_number);
                }
              }
            } else {
              console.log('❌ No bus assignment found for driver:', driver.id);
              // Try to find any available bus as fallback
              const availableBus = buses.find(bus => bus.status === 'in_service' && bus.tracking_status === 'active');
              if (availableBus) {
                setCurrentBus(availableBus);
                console.log('🔄 Using fallback bus:', availableBus.bus_number);
              }
            }
          } else {
            console.log('❌ Driver not found in drivers list. Looking for:', session.driver_id);
            console.log('Available driver IDs:', drivers.map(d => d.id));
          }
        } else {
          console.log('❌ No driver session found');
        }
      } catch (error) {
        console.error('❌ Error loading current driver:', error);
      }
    };

    // Only load when we have the necessary data
    if (drivers.length > 0 && driverBusAssignments.length > 0) {
      loadCurrentDriver();
    }
  }, [drivers, buses, driverBusAssignments, routes]);

  // Location watcher ref and helpers
  const locationWatchRef = useRef(null);

  const stopLocationUpdates = async () => {
    try {
      if (locationWatchRef.current && locationWatchRef.current.remove) {
        await locationWatchRef.current.remove();
      }
    } catch (_) {}
    locationWatchRef.current = null;
  };

  const startLocationUpdates = async (busId) => {
    try {
      console.log('🚀 Starting location updates for bus:', busId);
      
      // Ensure services enabled
      const services = await Location.hasServicesEnabledAsync();
      if (!services) {
        console.log('❌ Location services not enabled');
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('❌ Location permission not granted');
        return;
      }

      console.log('✅ Location services ready, starting watcher...');

      // Start high accuracy watcher
      locationWatchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          timeInterval: 1000,    // Update every 1 second (was 2000)
          distanceInterval: 1,   // Update on 1 meter change (was 2)
          mayShowUserSettingsDialog: true,
        },
        async (pos) => {
          const { latitude, longitude, accuracy, speed } = pos.coords || {};
          console.log('📍 Location update received:', { latitude, longitude, accuracy, speed });
          
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            console.log('⚠️ Invalid coordinates, skipping update');
            return;
          }
          
          try {
            console.log('📤 Sending location update to server...');
            const result = await updateBusLocation({
              busId,
              latitude,
              longitude,
              accuracy: typeof accuracy === 'number' ? accuracy : 10,
              speed: typeof speed === 'number' ? (speed * 3.6) : null, // m/s -> km/h
            });
            
            console.log('✅ Location update result:', result);
            setCurrentLocation({ latitude, longitude });
          } catch (e) {
            // Log and continue without interrupting the watcher
            console.error('❌ Bus location update failed:', e?.message || e);
          }
        }
      );
      
      console.log('✅ Location watcher started successfully');
    } catch (e) {
      console.error('❌ Failed to start location updates:', e?.message || e);
    }
  };

  // Start/stop location updates based on duty status and assigned bus
  useEffect(() => {
    console.log('🔄 Duty status changed:', { isOnDuty, currentBus: currentBus?.id });
    
    if (isOnDuty && currentBus?.id) {
      console.log('✅ Starting location updates for bus:', currentBus.id);
      startLocationUpdates(currentBus.id);
    } else {
      console.log('🛑 Stopping location updates');
      stopLocationUpdates();
    }
    return () => { stopLocationUpdates(); };
  }, [isOnDuty, currentBus?.id]);

  // Load and subscribe to ping notifications
  useEffect(() => {
    if (!currentBus?.id) return;

    // Initial load
    loadPingNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`ping-notifications-${currentBus.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ping_notifications',
          filter: `bus_id=eq.${currentBus.id}`
        },
        (payload) => {
          console.log('🔔 Ping notification change:', payload);
          loadPingNotifications();
          
          // Vibrate and alert on new ping
          if (payload.eventType === 'INSERT') {
            Vibration.vibrate([0, 200, 100, 200]);
            Alert.alert(
              '🔔 New Passenger Ping!',
              'A passenger has sent you a notification',
              [
                { text: 'View', onPress: () => setShowPingModal(true) },
                { text: 'Later', style: 'cancel' }
              ]
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBus?.id]);

  const loadPingNotifications = async () => {
    if (!currentBus?.id) return;

    try {
      const result = await getBusPingNotifications(currentBus.id);
      if (result.success && result.data) {
        setPingNotifications(result.data);
        const unreadCount = result.data.filter(p => p.status === 'pending').length;
        setUnreadPingCount(unreadCount);
      }
    } catch (error) {
      console.error('Error loading ping notifications:', error);
    }
  };

  const handleAcknowledgePing = async (pingId) => {
    try {
      const result = await acknowledgePing(pingId);
      if (result.success) {
        await loadPingNotifications();
        Alert.alert('Success', 'Ping acknowledged!');
      } else {
        Alert.alert('Error', result.error || 'Failed to acknowledge ping');
      }
    } catch (error) {
      console.error('Error acknowledging ping:', error);
      Alert.alert('Error', 'Failed to acknowledge ping');
    }
  };

  const handleCompletePing = async (pingId) => {
    try {
      const result = await completePing(pingId);
      if (result.success) {
        await loadPingNotifications();
        Alert.alert('Success', 'Ping completed!');
      } else {
        Alert.alert('Error', result.error || 'Failed to complete ping');
      }
    } catch (error) {
      console.error('Error completing ping:', error);
      Alert.alert('Error', 'Failed to complete ping');
    }
  };

  const handleViewLocation = (latitude, longitude, address, userName, pingId) => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      Alert.alert('Error', 'Invalid location coordinates');
      return;
    }

    // Navigate directly to map view
    navigation.navigate('DriverMap', {
      pingLocation: {
        latitude: lat,
        longitude: lng,
        address: address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        userName: userName || 'Passenger',
        pingId: pingId,
      },
    });
  };

  // Calculate driver stats from real data
  const calculateDriverStats = () => {
    if (!currentDriver) return [];
    
    const today = new Date().toDateString();
    const todaySchedules = schedules.filter(schedule => 
      schedule.bus_id === currentBus?.id && 
      new Date(schedule.departure_time).toDateString() === today
    );
    
    const driverBuses = buses.filter(bus => bus.driver_id === currentDriver.id);
    const activeBuses = driverBuses.filter(bus => bus.status === 'active');
    const totalPassengers = activeBuses.reduce((sum, bus) => sum + (bus.current_passengers || 0), 0);
    const totalDistance = activeBuses.reduce((sum, bus) => sum + (bus.distance_traveled || 0), 0);
    
    return [
      {
        title: 'Today\'s Trips',
        value: todaySchedules.length.toString(),
        icon: 'car',
        color: '#4CAF50',
      },
      {
        title: 'Passengers',
        value: totalPassengers.toString(),
        icon: 'account-group',
        color: '#2196F3',
      },
      {
        title: 'Distance',
        value: `${totalDistance.toFixed(1)} km`,
        icon: 'speedometer',
        color: '#FF9800',
      },
      {
        title: 'Active Buses',
        value: activeBuses.length.toString(),
        icon: 'bus',
        color: '#F44336',
      },
    ];
  };

  // Generate recent trips from schedules
  const generateRecentTrips = () => {
    const recentSchedules = schedules
      .filter(schedule => schedule.status === 'completed')
      .slice(0, 3)
      .map(schedule => {
        const route = routes.find(r => r.id === schedule.route_id);
        return {
          id: schedule.id,
          route: route ? `Route ${route.route_number}` : `Route ${schedule.route_id}`,
          startTime: new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          endTime: new Date(schedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          passengers: schedule.passengers_count || 0,
          status: schedule.status,
        };
      });
    
    return recentSchedules;
  };

  const driverStats = calculateDriverStats();
  const recentTrips = generateRecentTrips();

  const quickActions = [
    {
      title: 'Start Trip',
      icon: 'play-circle',
      color: '#4CAF50',
      action: 'startTrip',
    },
    {
      title: 'End Trip',
      icon: 'stop-circle',
      color: '#F44336',
      action: 'endTrip',
    },
    {
      title: 'Send Alarm',
      icon: 'warning',
      color: '#EF4444',
      action: 'alarm',
    },
    {
      title: 'Passengers',
      icon: 'people',
      color: '#2196F3',
      action: 'passengers',
    },
    {
      title: 'Capacity',
      icon: 'speedometer',
      color: '#00BCD4',
      action: 'capacity',
    },
    {
      title: 'Report Issue',
      icon: 'alert-circle',
      color: '#FF9800',
      action: 'reportIssue',
    },
    {
      title: 'Emergency',
      icon: 'alert-circle',
      color: '#E91E63',
      action: 'emergency',
    },
    {
      title: 'Profile',
      icon: 'person',
      color: '#9C27B0',
      action: 'profile',
    },
  ];

  const handleQuickAction = async (action) => {
    // Use the current driver from state
    if (!currentDriver) {
      Alert.alert('Error', 'Driver not found. Please log in again.');
      return;
    }
    
    // Use the current bus from state
    if (!currentBus) {
      Alert.alert('No Bus Assigned', 'No bus is currently assigned to you.');
      return;
    }

    switch (action) {
      case 'startTrip':
        if (isOnDuty) {
          Alert.alert('Already on duty', 'You are already on an active trip.');
        } else {
          try {
            setIsOnDuty(true);
            setTripStartTime(new Date());
            
            // Start trip in database
            // Use a default route ID if currentBus.route_id is null/undefined
            const routeId = currentBus.route_id || routes[0]?.id;
            if (!routeId) {
              Alert.alert('Error', 'No route available for this bus. Please contact support.');
              setIsOnDuty(false);
              return;
            }
            
            const tripResult = await startTrip(currentDriver.id, currentBus.id, routeId);
            
            // Update driver status
            await updateDriverStatus(currentDriver.id, 'active');
            
            // Create driver session in database
            const driverSession = await startDriverSession(currentDriver.id, currentBus.id);
            
            // Store session in AsyncStorage
            await AsyncStorage.setItem('driverSession', JSON.stringify(driverSession));
            
            const tripData = {
              route: `Route ${routes.find(r => r.id === currentBus.route_id)?.route_number || 'Unknown'}`,
              startTime: new Date().toLocaleTimeString(),
              passengers: 0,
              busId: currentBus.id,
              scheduleId: tripResult?.id || schedules.find(s => s.bus_id === currentBus.id && s.status === 'scheduled')?.id
            };
            
            setCurrentTrip(tripData);
            
            // Store trip data in AsyncStorage for other screens to access
            await AsyncStorage.setItem('currentTrip', JSON.stringify(tripData));
            
            Alert.alert('Trip Started', 'Your trip has been started successfully.');
          } catch (error) {
            console.error('Error starting trip:', error);
            Alert.alert('Error', 'Failed to start trip. Please try again.');
          }
        }
        break;
      case 'endTrip':
        if (!isOnDuty || !currentTrip) {
          Alert.alert('No active trip', 'You are not currently on an active trip.');
        } else {
          try {
            // End trip in database
            await endTrip(currentTrip.scheduleId, {
              busId: currentTrip.busId
            });
            
            // Update driver status
            await updateDriverStatus(currentDriver.id, 'inactive');
            
            // End driver session
            const sessionData = await AsyncStorage.getItem('driverSession');
            if (sessionData) {
              const session = JSON.parse(sessionData);
              await endDriverSession(session.id);
            }
            
            // Clear driver session and trip data
            await AsyncStorage.removeItem('driverSession');
            await AsyncStorage.removeItem('currentTrip');
            
            setIsOnDuty(false);
            setCurrentTrip(null);
            setPassengerCount(0);
            setTripStartTime(null);
            
            Alert.alert('Trip Ended', 'Your trip has been ended successfully.');
          } catch (error) {
            console.error('Error ending trip:', error);
            Alert.alert('Error', 'Failed to end trip. Please try again.');
          }
        }
        break;
      case 'passengers':
        setShowPassengerModal(true);
        break;
      case 'capacity':
        if (!currentBus) {
          Alert.alert('No Bus Assigned', 'No bus is currently assigned to you.');
        } else {
          setCurrentBus(currentBus);
          setCurrentCapacity(currentBus.capacity_percentage || 0);
          setShowCapacityModal(true);
        }
        break;
      case 'alarm':
        setShowAlarmModal(true);
        break;
      case 'reportIssue':
        navigation.navigate('DriverMaintenance');
        break;
      case 'emergency':
        navigation.navigate('DriverEmergency');
        break;
      case 'profile':
        navigation.navigate('DriverProfile');
        break;
    }
  };

  const handleCapacityUpdate = async (busId, capacityPercentage) => {
    try {
      await updateBusCapacityStatus(busId, capacityPercentage);
      setCurrentCapacity(capacityPercentage);
      // Update the bus in the local state
      const updatedBus = buses.find(bus => bus.id === busId);
      if (updatedBus) {
        updatedBus.capacity_percentage = capacityPercentage;
        updatedBus.current_passengers = Math.round((capacityPercentage / 100) * 50);
      }
    } catch (error) {
      console.error('Error updating capacity:', error);
      throw error;
    }
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', 'Driver profile screen coming soon!');
  };

  const handleMenuPress = () => {
    openDrawer();
  };

  const handleRoleSwitch = () => {
    Alert.alert(
      'Switch to Passenger Mode',
      'Are you a passenger?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Switch to Passenger',
          onPress: () => navigation.navigate('Home'),
        },
      ]
    );
  };

  const handleOffDuty = async () => {
    if (!isOnDuty) {
      Alert.alert('Already Off Duty', 'You are already off duty.');
      return;
    }

    Alert.alert(
      'Go Off Duty',
      'Are you sure you want to go off duty? This will stop location tracking.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Go Off Duty',
          onPress: async () => {
            try {
              // Optimistically update UI state so user isn't blocked by cleanup errors
              setIsOnDuty(false);
              setCurrentTrip(null);
              setPassengerCount(0);
              setTripStartTime(null);
              setCurrentLocation(null);

              // Stop location updates (non-fatal if this fails)
              try { await stopLocationUpdates(); } catch (e) { console.warn('stopLocationUpdates failed:', e?.message || e); }

              // Clear current location from bus (accept and continue on error)
              if (currentBus?.id) {
                try {
                  await updateBusLocation({
                    busId: currentBus.id,
                    latitude: null,
                    longitude: null,
                    accuracy: null,
                    speed: null,
                  });
                } catch (e) {
                  console.warn('Clearing bus location failed:', e?.message || e);
                }
              }

              // End driver session if present (continue on error)
              try {
                const sessionData = await AsyncStorage.getItem('driverSession');
                if (sessionData) {
                  const session = JSON.parse(sessionData);
                  if (session?.id) {
                    try { await endDriverSession(session.id); } catch (e) { console.warn('endDriverSession failed:', e?.message || e); }
                  }
                }
              } catch (e) {
                console.warn('Reading driverSession failed:', e?.message || e);
              }

              // Clear driver session key (non-blocking)
              try { await AsyncStorage.removeItem('driverSession'); } catch (e) { console.warn('removeItem(driverSession) failed:', e?.message || e); }

              // Update driver status (continue even if this fails due to RLS/columns)
              if (currentDriver?.id) {
                try { await updateDriverStatus(currentDriver.id, 'inactive'); } catch (e) { console.warn('updateDriverStatus failed:', e?.message || e); }
              }

              // Hard enforce bus offline in DB so status can't stay 'active'
              if (supabase && currentBus?.id) {
                try {
                  await supabase
                    .from('buses')
                    .update({
                      status: 'inactive',
                      tracking_status: 'stopped',
                      driver_id: null,
                      updated_at: new Date().toISOString(),
                      last_location_update: new Date().toISOString(),
                    })
                    .eq('id', currentBus.id);
                } catch (e) {
                  console.warn('force bus offline failed:', e?.message || e);
                }
              }

              Alert.alert('Off Duty', 'You are now off duty. Location tracking has stopped.');
            } catch (error) {
              console.error('Error going off duty:', error);
              Alert.alert('Error', 'Failed to go off duty. Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Loading driver data...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#F44336" />
          <Text style={styles.errorText}>Failed to load driver data</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={async () => {
            try {
              await refreshData();
            } catch (error) {
              console.error('Error refreshing data:', error);
            }
          }}>
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
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Driver Dashboard</Text>
            <Text style={styles.headerSubtitle}>Metro NaviGo Driver</Text>
          </View>
          <View style={styles.headerRightButtons}>
            <TouchableOpacity 
              style={styles.pingButton} 
              onPress={() => setShowPingModal(true)}
            >
              <Ionicons name="notifications" size={24} color="#fff" />
              {unreadPingCount > 0 && (
                <View style={styles.pingBadge}>
                  <Text style={styles.pingBadgeText}>{unreadPingCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
              <Ionicons name="person-circle" size={32} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.dutyStatus}>
          <View style={styles.statusRow}>
            <View style={styles.statusInfo}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusText, { color: isOnDuty ? '#10B981' : '#EF4444' }]}>
                {isOnDuty ? 'On Duty' : 'Off Duty'}
              </Text>
            </View>
            <View style={styles.buttonRow}>
              {isOnDuty && (
                <TouchableOpacity style={styles.offDutyButton} onPress={handleOffDuty}>
                  <Ionicons name="stop-circle" size={20} color="#EF4444" />
                  <Text style={styles.offDutyText}>Off Duty</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.switchButton} onPress={handleRoleSwitch}>
                <Ionicons name="swap-horizontal" size={20} color="#f59e0b" />
                <Text style={styles.switchText}>Switch Mode</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Trip - Prominent Card */}
        {currentTrip && (
          <View style={styles.currentTripCard}>
            <View style={styles.tripHeader}>
              <View style={styles.tripIconContainer}>
                <Ionicons name="bus" size={24} color="#f59e0b" />
              </View>
              <View style={styles.tripHeaderText}>
                <Text style={styles.currentTripTitle}>Active Trip</Text>
                <Text style={styles.tripRoute}>{currentTrip.route}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statusBadgeText}>ON TRIP</Text>
              </View>
            </View>
            
            <View style={styles.tripStats}>
              <View style={styles.tripStatItem}>
                <Ionicons name="people" size={20} color="#6B7280" />
                <Text style={styles.tripStatLabel}>Passengers</Text>
                <Text style={styles.tripStatValue}>{passengerCount}</Text>
              </View>
              <View style={styles.tripStatItem}>
                <Ionicons name="time" size={20} color="#6B7280" />
                <Text style={styles.tripStatLabel}>Duration</Text>
                <Text style={styles.tripStatValue}>
                  {tripStartTime ? Math.floor((new Date() - tripStartTime) / 60000) : 0}m
                </Text>
              </View>
              <View style={styles.tripStatItem}>
                <Ionicons name="speedometer" size={20} color="#6B7280" />
                <Text style={styles.tripStatLabel}>Capacity</Text>
                <Text style={styles.tripStatValue}>{currentCapacity}%</Text>
              </View>
            </View>
          </View>
        )}

        {/* Stats Overview - Horizontal Cards */}
        <View style={styles.statsOverview}>
          <Text style={styles.sectionTitle}>Today's Overview</Text>
          <View style={styles.statsRow}>
            {driverStats.slice(0, 2).map((stat, index) => (
              <View key={index} style={styles.statCardHorizontal}>
                <View style={[styles.statIconSmall, { backgroundColor: stat.color + '15' }]}>
                  <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValueSmall}>{stat.value}</Text>
                  <Text style={styles.statTitleSmall}>{stat.title}</Text>
                </View>
              </View>
            ))}
          </View>
          <View style={styles.statsRow}>
            {driverStats.slice(2, 4).map((stat, index) => (
              <View key={index + 2} style={styles.statCardHorizontal}>
                <View style={[styles.statIconSmall, { backgroundColor: stat.color + '15' }]}>
                  <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statValueSmall}>{stat.value}</Text>
                  <Text style={styles.statTitleSmall}>{stat.title}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Quick Actions - Essential Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((action, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.quickActionCard,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => handleQuickAction(action.action)}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: action.color + '15' }]}>
                  <Ionicons name={action.icon} size={24} color={action.color} />
                </View>
                <Text style={styles.quickActionTitle}>{action.title}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Recent Trips - Compact List */}
        {recentTrips.length > 0 && (
          <View style={styles.recentTripsSection}>
            <Text style={styles.sectionTitle}>Recent Trips</Text>
            <View style={styles.tripsListCompact}>
              {recentTrips.map((trip) => (
                <View key={trip.id} style={styles.tripCardCompact}>
                  <View style={styles.tripCardLeft}>
                    <View style={styles.tripIconSmall}>
                      <Ionicons name="bus" size={16} color="#f59e0b" />
                    </View>
                    <View style={styles.tripInfoCompact}>
                      <Text style={styles.tripRouteCompact}>{trip.route}</Text>
                      <Text style={styles.tripTimeCompact}>{trip.startTime} - {trip.endTime}</Text>
                    </View>
                  </View>
                  <View style={styles.tripCardRight}>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: '#10B981' }]}>
                      <Text style={styles.statusBadgeTextSmall}>{trip.status}</Text>
                    </View>
                    <Text style={styles.tripPassengersCompact}>{trip.passengers} passengers</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Passenger Management Modal */}
      <Modal
        visible={showPassengerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPassengerModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Passenger Count</Text>
            <TouchableOpacity onPress={() => setShowPassengerModal(false)}>
              <Text style={styles.modalSave}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <View style={styles.passengerCounter}>
              <Text style={styles.passengerLabel}>Current Passengers</Text>
              <View style={styles.counterContainer}>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => setPassengerCount(Math.max(0, passengerCount - 1))}
                >
                  <Ionicons name="remove" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.counterText}>{passengerCount}</Text>
                <TouchableOpacity 
                  style={styles.counterButton}
                  onPress={() => setPassengerCount(passengerCount + 1)}
                >
                  <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
              </View>
              <Text style={styles.capacityText}>Max Capacity: 50</Text>
            </View>

            <View style={styles.passengerActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    setPassengerCount(0);
                    if (currentTrip?.busId) {
                      await updatePassengerCount(currentTrip.busId, 0);
                    }
                    Alert.alert('Reset', 'Passenger count has been reset to 0');
                  } catch (error) {
                    console.error('Error resetting passenger count:', error);
                    Alert.alert('Error', 'Failed to reset passenger count');
                  }
                }}
              >
                <Ionicons name="refresh" size={20} color="#f59e0b" />
                <Text style={styles.actionButtonText}>Reset Count</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    const newCount = passengerCount + 1;
                    setPassengerCount(newCount);
                    if (currentTrip?.busId) {
                      await updatePassengerCount(currentTrip.busId, newCount);
                    }
                    Alert.alert('Boarding', 'Passenger boarding recorded');
                  } catch (error) {
                    console.error('Error recording boarding:', error);
                    Alert.alert('Error', 'Failed to record boarding');
                  }
                }}
              >
                <Ionicons name="arrow-up" size={20} color="#10B981" />
                <Text style={styles.actionButtonText}>Record Boarding</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={async () => {
                  try {
                    const newCount = Math.max(0, passengerCount - 1);
                    setPassengerCount(newCount);
                    if (currentTrip?.busId) {
                      await updatePassengerCount(currentTrip.busId, newCount);
                    }
                    Alert.alert('Alighting', 'Passenger alighting recorded');
                  } catch (error) {
                    console.error('Error recording alighting:', error);
                    Alert.alert('Error', 'Failed to record alighting');
                  }
                }}
              >
                <Ionicons name="arrow-down" size={20} color="#EF4444" />
                <Text style={styles.actionButtonText}>Record Alighting</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Capacity Status Modal */}
      <CapacityStatusModal
        visible={showCapacityModal}
        onClose={() => setShowCapacityModal(false)}
        currentCapacity={currentCapacity}
        onUpdateCapacity={handleCapacityUpdate}
        busId={currentBus?.id}
        busInfo={currentBus}
      />

      {/* Ping Notifications Modal */}
      <Modal
        visible={showPingModal}
        animationType="slide"
        presentationStyle="fullScreen"
        transparent={false}
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPingModal(false)}>
              <Text style={styles.modalCancel}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Passenger Pings</Text>
            <TouchableOpacity onPress={loadPingNotifications}>
              <Ionicons name="refresh" size={24} color="#f59e0b" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={pingNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContentContainer}
            showsVerticalScrollIndicator={true}
            bounces={true}
            keyboardShouldPersistTaps="handled"
            removeClippedSubviews={false}
            scrollEventThrottle={16}
            ListEmptyComponent={() => (
              <View style={styles.emptyPingContainer}>
                <Ionicons name="notifications-off" size={64} color="#D1D5DB" />
                <Text style={styles.emptyPingText}>No ping notifications</Text>
                <Text style={styles.emptyPingSubtext}>Passengers will appear here when they ping you</Text>
              </View>
            )}
            renderItem={({ item: ping }) => (
                <View style={styles.pingCard}>
                  <View style={styles.pingHeader}>
                    <View style={styles.pingUserInfo}>
                      <Ionicons name="person-circle" size={40} color="#f59e0b" />
                      <View style={{ marginLeft: 12 }}>
                        <Text style={styles.pingUserName}>
                          {ping.user_name || 'Passenger'}
                        </Text>
                        <Text style={styles.pingTime}>
                          {new Date(ping.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </View>
                    <View style={[
                      styles.pingStatusBadge,
                      { backgroundColor: 
                        ping.status === 'pending' ? '#FEF3C7' :
                        ping.status === 'acknowledged' ? '#DBEAFE' :
                        '#D1FAE5'
                      }
                    ]}>
                      <Text style={[
                        styles.pingStatusText,
                        { color:
                          ping.status === 'pending' ? '#92400E' :
                          ping.status === 'acknowledged' ? '#1E40AF' :
                          '#065F46'
                        }
                      ]}>
                        {ping.status === 'pending' ? 'NEW' :
                         ping.status === 'acknowledged' ? 'SEEN' :
                         'DONE'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pingBody}>
                    <View style={styles.pingTypeRow}>
                      <Ionicons 
                        name={
                          ping.ping_type === 'ride_request' ? 'bus' :
                          ping.ping_type === 'location_request' ? 'location' :
                          ping.ping_type === 'eta_request' ? 'time' :
                          'chatbubble'
                        } 
                        size={16} 
                        color="#6B7280" 
                      />
                      <Text style={styles.pingType}>
                        {ping.ping_type === 'ride_request' ? 'Ride Request' :
                         ping.ping_type === 'location_request' ? 'Location Request' :
                         ping.ping_type === 'eta_request' ? 'ETA Request' :
                         'Message'}
                      </Text>
                    </View>

                    {ping.message && (
                      <Text style={styles.pingMessage}>{ping.message}</Text>
                    )}

                    {ping.location_latitude && ping.location_longitude && (
                      <TouchableOpacity 
                        style={styles.pingLocation}
                        onPress={() => handleViewLocation(
                          ping.location_latitude,
                          ping.location_longitude,
                          ping.location_address,
                          ping.user_name || 'Passenger',
                          ping.id
                        )}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="location" size={16} color="#f59e0b" />
                        <Text style={styles.pingLocationText}>
                          {ping.location_address || `${ping.location_latitude.toFixed(5)}, ${ping.location_longitude.toFixed(5)}`}
                        </Text>
                        <Ionicons name="open-outline" size={16} color="#f59e0b" style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {ping.status === 'pending' && (
                    <View style={styles.pingActions}>
                      <TouchableOpacity 
                        style={[styles.pingActionButton, styles.acknowledgeButton]}
                        onPress={() => handleAcknowledgePing(ping.id)}
                        delayPressIn={0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                        <Text style={styles.pingActionButtonText}>Acknowledge</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.pingActionButton, styles.completeButton]}
                        onPress={() => handleCompletePing(ping.id)}
                        delayPressIn={0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                        <Text style={styles.pingActionButtonText}>Complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {ping.status === 'acknowledged' && (
                    <View style={styles.pingActions}>
                      <TouchableOpacity 
                        style={[styles.pingActionButton, styles.completeButton, { flex: 1 }]}
                        onPress={() => handleCompletePing(ping.id)}
                        delayPressIn={0}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                        <Text style={styles.pingActionButtonText}>Mark Complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      <AlarmModal
        visible={showAlarmModal}
        onClose={() => setShowAlarmModal(false)}
        userType="driver"
        driverId={currentDriver?.id}
        busId={currentBus?.id}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    backgroundColor: '#f59e0b',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dutyStatus: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 20,
    marginTop: -20,
    marginHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusInfo: {
    flexShrink: 0,
    marginRight: 16,
    paddingTop: 4,
  },
  statusLabel: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'System',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'System',
  },
  buttonRow: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    flexShrink: 1,
    paddingTop: 4,
  },
  offDutyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  offDutyText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'System',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    marginTop: 8,
  },
  switchText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'System',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  currentTripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    marginTop: 24,
    marginBottom: 24,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 25,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#f0f9ff',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tripIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  tripHeaderText: {
    flex: 1,
  },
  currentTripTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
    fontFamily: 'System',
  },
  tripRoute: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  tripStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tripStatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  tripStatLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'System',
  },
  tripStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statsOverview: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statCardHorizontal: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statContent: {
    flex: 1,
  },
  statValueSmall: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statTitleSmall: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    width: (width - 72) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#f8f9fa',
  },
  cardPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.8,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    fontFamily: 'System',
  },
  recentTripsSection: {
    marginBottom: 32,
  },
  tripsListCompact: {
  },
  tripCardCompact: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    marginBottom: 12,
    shadowRadius: 8,
    elevation: 2,
  },
  tripCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tripCardRight: {
    alignItems: 'flex-end',
  },
  tripIconSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripInfoCompact: {
    flex: 1,
  },
  tripRouteCompact: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
    fontFamily: 'System',
  },
  tripTimeCompact: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  statusBadgeTextSmall: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  tripPassengersCompact: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  tripsList: {
    marginBottom: 32,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripRoute: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    fontFamily: 'System',
  },
  tripDetails: {
  },
  tripDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 8,
  },
  tripDetailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    fontWeight: '500',
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FAFAFA',
  },
  errorText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 16,
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
    fontFamily: 'System',
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#f59e0b',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  modalCancel: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  modalSave: {
    fontSize: 16,
    color: '#f59e0b',
    fontWeight: '600',
    fontFamily: 'System',
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: 24,
    paddingBottom: 40,
  },
  passengerCounter: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  passengerLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 24,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  counterButton: {
    backgroundColor: '#f59e0b',
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  counterText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#1A1A1A',
    marginHorizontal: 32,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  capacityText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'System',
  },
  passengerActions: {
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 16,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 16,
    fontWeight: '600',
    fontFamily: 'System',
  },
  pingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    position: 'relative',
  },
  pingBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  pingBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyPingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyPingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyPingSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  pingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  pingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pingUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pingUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  pingTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  pingStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pingStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pingBody: {
    marginBottom: 16,
  },
  pingTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pingType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 8,
  },
  pingMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  pingLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  pingLocationText: {
    fontSize: 13,
    color: '#92400E',
    marginLeft: 6,
    flex: 1,
  },
  pingActions: {
    flexDirection: 'row',
  },
  pingActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginLeft: 12,
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  pingActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
}); 
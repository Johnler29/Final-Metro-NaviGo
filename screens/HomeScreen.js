import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Dimensions,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSupabase } from '../contexts/SupabaseContext';
import { useDrawer } from '../contexts/DrawerContext';
import SetAlarmModal from '../components/SetAlarmModal';

const { width } = Dimensions.get('window');

const services = [
  {
    title: 'Set an Alarm',
    icon: 'alarm',
    color: '#f59e0b',
  },
  {
    title: 'Check Bus Schedules',
    icon: 'schedule',
    color: '#f59e0b',
  },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Format distance for display
function formatDistance(distance) {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} meters`;
  }
  return `${distance.toFixed(1)} km`;
}

// Calculate estimated arrival time based on distance and bus speed
function calculateETA(distance, speed = 25) {
  const timeInHours = distance / speed;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  if (timeInMinutes < 1) {
    return 'Less than 1 min';
  } else if (timeInMinutes < 60) {
    return `${timeInMinutes} mins`;
  } else {
    const hours = Math.floor(timeInMinutes / 60);
    const minutes = timeInMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
}

export default function HomeScreen({ navigation }) {
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [nearbyBuses, setNearbyBuses] = useState([]);
  const [showSetAlarmModal, setShowSetAlarmModal] = useState(false);
  
  // Get data from Supabase context
  const { 
    buses, 
    routes, 
    loading, 
    error, 
    connectionStatus,
    submitFeedback,
    refreshData 
  } = useSupabase();

  // Get drawer context
  const { openDrawer } = useDrawer();

  const handleServicePress = (service) => {
    if (service.title === 'Set an Alarm') {
      setShowSetAlarmModal(true);
    } else {
      navigation.navigate('Routes');
    }
  };

  const handleBusPress = (bus) => {
    navigation.navigate('Map', { selectedBusId: bus.id });
  };

  const handleSearch = () => {
    if (search.trim() === '') return;
    navigation.getParent()?.navigate('RouteSearch', { query: search });
  };

  const handleProfilePress = () => {
    Alert.alert('Profile', 'Profile screen coming soon!');
  };

  const handleMenuPress = () => {
    openDrawer();
  };

  // Request location permission and get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Location permission denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(location);
      setLocationError(null);
      console.log('📍 Location obtained:', location.coords);
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setLocationError('Failed to get location');
    }
  };

  // Calculate nearby buses based on user location
  const calculateNearbyBuses = () => {
    if (!location || !buses.length) {
      setNearbyBuses([]);
      return;
    }

    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;

    const busesWithDistance = buses
      .filter(bus => {
        // Show buses that have active drivers and valid coordinates (same logic as MapScreen)
        const hasActiveDriver = bus.driver_id && bus.status === 'active';
        const hasValidCoordinates = bus.latitude && bus.longitude && 
          !isNaN(bus.latitude) && !isNaN(bus.longitude);
        
        // Debug logging for each bus
        console.log('🏠 HomeScreen - Bus filter check:', {
          bus_number: bus.bus_number,
          driver_id: bus.driver_id,
          status: bus.status,
          hasActiveDriver,
          hasValidCoordinates,
          coords: { lat: bus.latitude, lng: bus.longitude }
        });
        
        return hasActiveDriver && hasValidCoordinates;
      })
      .map(bus => {
        // Use fallback coordinates if needed
        let lat = bus.latitude;
        let lng = bus.longitude;
        
        if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
          console.log('🏠 HomeScreen - No valid coordinates for bus, using fallback location');
          const sampleCoords = [
            { lat: 14.3294, lng: 120.9366 }, // Dasmarinas Terminal
            { lat: 14.4591, lng: 120.9468 }, // Bacoor
            { lat: 14.5995, lng: 120.9842 }  // Manila City Hall
          ];
          const randomCoord = sampleCoords[Math.floor(Math.random() * sampleCoords.length)];
          lat = randomCoord.lat;
          lng = randomCoord.lng;
        }
        
        const distance = calculateDistance(
          userLat, 
          userLon, 
          lat, 
          lng
        );
        
        const route = routes.find(r => r.id === bus.route_id);
        
        return {
          id: bus.id,
          name: bus.name || `Metro Link Bus # ${bus.bus_number}`,
          distance: formatDistance(distance),
          distanceKm: distance,
          estimatedArrival: `Estimated arrival ${calculateETA(distance, bus.speed || 25)}`,
          busId: bus.id,
          currentLocation: { latitude: lat, longitude: lng },
          lastUpdated: bus.last_location_update || bus.updated_at,
          route: route ? `Route ${route.route_number}` : 'Unknown',
          status: bus.tracking_status || bus.status || 'active',
          avgFare: bus.avg_fare || 15
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm) // Sort by distance
      .slice(0, 3); // Get top 3 closest buses

    setNearbyBuses(busesWithDistance);
    console.log('🚌 Nearby buses calculated:', busesWithDistance.length);
  };

  const handleSubmitFeedback = async () => {
    if (feedback.trim() === '') {
      Alert.alert('Error', 'Please enter your feedback');
      return;
    }

    try {
      setSubmittingFeedback(true);
      await submitFeedback(feedback);
      Alert.alert('Success', 'Thank you for your feedback!');
      setFeedback('');
    } catch (error) {
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
      console.error('Feedback submission error:', error);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Calculate nearby buses when location or buses change
  useEffect(() => {
    calculateNearbyBuses();
  }, [location, buses, routes]);

  // Set up location updates every 30 seconds
  useEffect(() => {
    if (!location) return;

    const interval = setInterval(() => {
      getCurrentLocation();
    }, 30000); // Update location every 30 seconds

    return () => clearInterval(interval);
  }, [location]);


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>
          {connectionStatus === 'testing' ? 'Testing database connection...' : 'Loading bus data...'}
        </Text>
        {connectionStatus === 'testing' && (
          <Text style={styles.loadingSubtext}>Checking Supabase connection</Text>
        )}
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="warning" size={48} color="#F44336" />
        <Text style={styles.errorText}>
          {connectionStatus === 'failed' ? 'Database Connection Failed' : 'Failed to load bus data'}
        </Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={async () => {
          try {
            await refreshData();
          } catch (error) {
            console.error('Error refreshing data:', error);
          }
        }}>
          <Text style={styles.retryButtonText}>Retry Connection</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.menuButton} onPress={handleMenuPress}>
            <Ionicons name="menu" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.locationContainer}>
            <Ionicons 
              name={location ? "location" : "location-outline"} 
              size={14} 
              color="#fff" 
            />
            <Text style={styles.locationText}>
              {location ? "Location Active" : "Getting Location..."}
            </Text>
          </View>
          
          <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
            <Ionicons name="person-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Welcome Section with Quick Stats */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcome}>Welcome to Metro Link</Text>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <Ionicons name="bus" size={20} color="#f59e0b" />
              <Text style={styles.quickStatNumber}>{buses.length}</Text>
              <Text style={styles.quickStatLabel}>Buses</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="navigate" size={20} color="#10b981" />
              <Text style={styles.quickStatNumber}>{routes.length}</Text>
              <Text style={styles.quickStatLabel}>Routes</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="location" size={20} color="#3b82f6" />
              <Text style={styles.quickStatNumber}>{nearbyBuses.length}</Text>
              <Text style={styles.quickStatLabel}>Nearby</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Search</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#aaa" style={{ marginLeft: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your bus routes"
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications" size={20} color="#f59e0b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Explore Services - Modern Grid */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color="#f59e0b" />
            </TouchableOpacity>
          </View>
          <View style={styles.servicesRow}>
            {services.map((service, idx) => (
              <Pressable
                key={idx}
                style={({ pressed }) => [
                  styles.modernServiceCard,
                  pressed && styles.cardPressed,
                ]}
                android_ripple={{ color: '#ffe4b3' }}
                onPress={() => handleServicePress(service)}
              >
                <View style={styles.serviceIconContainer}>
                  <MaterialIcons name={service.icon} size={28} color={service.color} />
                </View>
                <Text style={styles.modernServiceTitle}>{service.title}</Text>
                <View style={styles.modernArrowContainer}>
                  <Ionicons name="arrow-forward" size={16} color="#fff" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Nearby Buses */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            Nearby Buses {location && `(${nearbyBuses.length})`}
          </Text>
          {location && (
            <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
              <Ionicons name="refresh" size={16} color="#f59e0b" />
            </TouchableOpacity>
          )}
        </View>
        
        {!location ? (
          <View style={styles.locationPromptContainer}>
            <Ionicons name="location-outline" size={48} color="#f59e0b" />
            <Text style={styles.locationPromptText}>Enable location to see nearby buses</Text>
            <TouchableOpacity style={styles.enableLocationButton} onPress={getCurrentLocation}>
              <Text style={styles.enableLocationButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        ) : nearbyBuses.length > 0 ? (
          <View style={styles.busesContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.busesScrollContainer}
              decelerationRate="fast"
              snapToInterval={360} // 340 card width + 20 margin
              snapToAlignment="start"
            >
              {nearbyBuses.map((bus, index) => (
                <Pressable
                  key={bus.id}
                  style={({ pressed }) => [
                    styles.modernBusCard,
                    pressed && styles.cardPressed,
                  ]}
                  android_ripple={{ color: '#e0e0e0' }}
                  onPress={() => handleBusPress(bus)}
                >
                {/* Modern ETA Badge - Top Priority */}
                <View style={styles.etaBadgeContainer}>
                  <View style={styles.etaBadge}>
                    <Ionicons name="time-outline" size={18} color="#fff" />
                    <Text style={styles.etaBadgeText}>
                      {calculateETA(bus.distanceKm, bus.speed || 25).replace('Estimated arrival ', '')}
                    </Text>
                  </View>
                  <View style={[
                    styles.modernStatusBadge, 
                    { backgroundColor: bus.status === 'active' ? '#10b981' : '#f59e0b' }
                  ]}>
                    <View style={styles.statusDot} />
                    <Text style={styles.modernStatusText}>{bus.status}</Text>
                  </View>
                </View>

                {/* Bus Number and Route - Hero Section */}
                <View style={styles.busHeroSection}>
                  <View style={styles.busIconCircle}>
                    <Ionicons name="bus" size={28} color="#f59e0b" />
                  </View>
                  <View style={styles.busMainInfo}>
                    <Text style={styles.modernBusNumber}>Bus #{bus.name.split('# ')[1]}</Text>
                    <View style={styles.modernRouteBadge}>
                      <Ionicons name="navigate-circle" size={14} color="#10b981" />
                      <Text style={styles.modernRouteText}>{bus.route}</Text>
                    </View>
                  </View>
                </View>

                {/* Distance and Fare Section */}
                <View style={styles.infoGrid}>
                  <View style={styles.infoGridItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="location" size={16} color="#3b82f6" />
                    </View>
                    <View>
                      <Text style={styles.infoGridLabel}>Distance</Text>
                      <Text style={styles.infoGridValue}>{bus.distance}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.infoGridDivider} />
                  
                  <View style={styles.infoGridItem}>
                    <View style={styles.infoIconContainer}>
                      <Ionicons name="cash" size={16} color="#10b981" />
                    </View>
                    <View>
                      <Text style={styles.infoGridLabel}>Fare</Text>
                      <Text style={styles.infoGridValue}>₱{bus.avgFare}</Text>
                    </View>
                  </View>
                </View>

                {/* Track Button */}
                <TouchableOpacity style={styles.trackButton} onPress={() => handleBusPress(bus)}>
                  <Text style={styles.trackButtonText}>Track Bus</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </TouchableOpacity>

                {/* Last Updated Footer */}
                {bus.lastUpdated && (
                  <View style={styles.modernLastUpdated}>
                    <View style={styles.liveIndicator} />
                    <Text style={styles.modernLastUpdatedText}>
                      Updated {new Date(bus.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                )}
              </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={styles.noBusesContainer}>
            <Ionicons name="bus" size={48} color="#ccc" />
            <Text style={styles.noBusesText}>No buses found nearby</Text>
            <Text style={styles.noBusesSubtext}>Try refreshing or check back later</Text>
          </View>
        )}

        {/* Review and Feedback */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionLabel}>Review and Feedback</Text>
          <Text style={styles.feedbackDescription}>
            Tell us about your Metro Link experience and share any ideas you have to help enhance your travel experience.
          </Text>
          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackInputContainer}>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Submit your feedback here..."
                placeholderTextColor="#aaa"
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                editable={!submittingFeedback}
              />
              <View style={styles.characterCount}>
                <Text style={styles.characterCountText}>{feedback.length}/500</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.submitButton, submittingFeedback && styles.submitButtonDisabled]} 
              onPress={handleSubmitFeedback}
              disabled={submittingFeedback}
            >
              {submittingFeedback ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Set Alarm Modal */}
      <SetAlarmModal
        visible={showSetAlarmModal}
        onClose={() => setShowSetAlarmModal(false)}
        userType="passenger"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noBusesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noBusesText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    textAlign: 'center',
  },
  noBusesSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  locationPromptContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 25,
  },
  locationPromptText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  enableLocationButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  enableLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flex: 1,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  locationText: {
    color: '#fff',
    fontSize: 13,
    marginLeft: 6,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
  },
  contentContainer: {
    paddingBottom: 120,
  },
  welcomeSection: {
    marginTop: 24,
    marginBottom: 32,
  },
  welcome: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1a1a1a',
    fontFamily: 'System',
    letterSpacing: -1,
    lineHeight: 38,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  quickStatNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginTop: 8,
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchSection: {
    marginBottom: 32,
  },
  servicesSection: {
    marginBottom: 40,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  searchInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    paddingHorizontal: 20,
    color: '#1a1a1a',
    fontFamily: 'System',
    fontWeight: '400',
  },
  notificationButton: {
    width: 48,
    height: 48,
    marginRight: 12,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  modernServiceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    minHeight: 140,
    justifyContent: 'space-between',
  },
  serviceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#fff5e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ffe4b3',
  },
  modernServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    lineHeight: 20,
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
  modernArrowContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  busesContainer: {
    marginBottom: 40,
  },
  busesScrollContainer: {
    paddingRight: 24,
    paddingLeft: 0,
  },
  modernBusCard: {
    width: 340,
    backgroundColor: '#fff',
    borderRadius: 32,
    marginRight: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  etaBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  etaBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  modernStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  busHeroSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  busIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#fff5e6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#ffe4b3',
  },
  busMainInfo: {
    flex: 1,
  },
  modernBusNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  modernRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#d1fae5',
  },
  modernRouteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    marginLeft: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  infoGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoGridLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoGridValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  infoGridDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 16,
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 20,
    paddingVertical: 16,
    gap: 8,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modernLastUpdated: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  modernLastUpdatedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
  },
  busHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  busNumberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  busNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f59e0b',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  routeBadge: {
    backgroundColor: '#f0f9f0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e8f5e8',
  },
  routeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f59e0b',
    fontFamily: 'System',
    letterSpacing: 0.2,
  },
  busMapContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  mapGradient: {
    flex: 1,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  busLocationPin: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'System',
  },
  busInfo: {
    flex: 1,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  etaText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 6,
    fontWeight: '500',
    fontFamily: 'System',
  },
  busStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  busStatusIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  busStatus: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'System',
    textTransform: 'capitalize',
    flex: 1,
  },
  speedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  speedText: {
    fontSize: 10,
    color: '#999',
    marginLeft: 4,
    fontFamily: 'System',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastUpdated: {
    fontSize: 10,
    color: '#999',
    fontFamily: 'System',
    marginLeft: 4,
  },
  actionArrow: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f0f9f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedbackSection: {
    marginBottom: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  feedbackDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'System',
    fontWeight: '500',
  },
  feedbackContainer: {
    marginBottom: 20,
  },
  feedbackInputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  feedbackInput: {
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    padding: 24,
    fontSize: 15,
    color: '#1a1a1a',
    fontFamily: 'System',
    minHeight: 160,
    textAlignVertical: 'top',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    fontWeight: '500',
  },
  characterCount: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  characterCountText: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'System',
  },
  submitButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 28,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'System',
    marginLeft: 8,
  },
}); 
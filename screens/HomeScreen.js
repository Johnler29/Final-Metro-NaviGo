import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSupabase } from '../contexts/SupabaseContext';
import { colors, spacing, radius, shadows, cardStyles } from '../styles/uiTheme';

const services = [
  {
    title: 'Check Bus Schedules',
    icon: 'schedule',
    color: colors.brand,
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


  const handleServicePress = (service) => {
    navigation.navigate('Routes');
  };

  const handleBusPress = (bus) => {
    navigation.navigate('Map', { selectedBusId: bus.id });
  };

  const handleSearch = () => {
    if (search.trim() === '') return;
    navigation.getParent()?.navigate('RouteSearch', { query: search });
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
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
        const hasValidCoordinates = bus.latitude != null && bus.longitude != null && 
          !isNaN(bus.latitude) && !isNaN(bus.longitude);
        
        // Check if bus has recent location update (within last 5 minutes) - ensures driver is still on duty
        const hasRecentLocation = bus.last_location_update && 
          new Date(bus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000);
        
        // Debug logging for each bus
        console.log('🏠 HomeScreen - Bus filter check:', {
          bus_number: bus.bus_number,
          driver_id: bus.driver_id,
          status: bus.status,
          hasActiveDriver,
          hasValidCoordinates,
          hasRecentLocation,
          coords: { lat: bus.latitude, lng: bus.longitude }
        });
        
        // Only show buses with active drivers, valid coordinates, and recent location updates
        return hasActiveDriver && hasValidCoordinates && hasRecentLocation;
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
          name: bus.name || `NaviGO Bus # ${bus.bus_number}`,
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
        <ActivityIndicator size="large" color={colors.brand} />
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
        <Ionicons name="warning" size={48} color={colors.danger} />
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
          <View style={styles.locationPill}>
            <View style={styles.locationStatusDot} />
            <View style={styles.locationPillContent}>
              <Ionicons
                name={location ? 'location-outline' : 'location-outline'}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.locationText}>
                {location ? 'Location active' : 'Getting location…'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerIconButton} onPress={handleProfilePress}>
            <Ionicons name="person-circle-outline" size={22} color="#fff" />
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
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.welcome}>NaviGO</Text>
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCard}>
              <Ionicons name="bus" size={20} color={colors.brand} />
              <Text style={styles.quickStatNumber}>{buses.length}</Text>
              <Text style={styles.quickStatLabel}>Buses</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="navigate" size={20} color={colors.success} />
              <Text style={styles.quickStatNumber}>{routes.length}</Text>
              <Text style={styles.quickStatLabel}>Routes</Text>
            </View>
            <View style={styles.quickStatCard}>
              <Ionicons name="location" size={20} color={colors.info} />
              <Text style={styles.quickStatNumber}>{nearbyBuses.length}</Text>
              <Text style={styles.quickStatLabel}>Nearby</Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionLabel}>Search</Text>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color={colors.textMuted} style={{ marginLeft: spacing.md }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your bus routes"
              placeholderTextColor={colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications-outline" size={20} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Explore Services - Modern Grid */}
        <View style={styles.servicesSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.brand} />
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
                android_ripple={{ color: colors.brandSoft }}
                onPress={() => handleServicePress(service)}
              >
                <View style={styles.serviceIconContainer}>
                  <MaterialIcons name={service.icon} size={28} color={service.color || colors.brand} />
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
              <Ionicons name="refresh" size={16} color={colors.brand} />
            </TouchableOpacity>
          )}
        </View>
        
        {!location ? (
          <View style={styles.locationPromptContainer}>
            <Ionicons name="location-outline" size={48} color={colors.brand} />
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
            <View style={styles.emptyBusIllustration}>
              <View style={styles.emptyBusBody}>
                <Ionicons name="bus-outline" size={36} color={colors.textSecondary} />
              </View>
              <View style={styles.emptyBusWheelsRow}>
                <View style={styles.emptyWheel} />
                <View style={styles.emptyWheel} />
              </View>
            </View>
            <Text style={styles.noBusesText}>No nearby buses right now</Text>
            <Text style={styles.noBusesSubtext}>We’ll show live buses here as soon as they’re close to you.</Text>
          </View>
        )}

        {/* Review and Feedback */}
        <View style={styles.feedbackSection}>
          <Text style={styles.sectionLabel}>Review and Feedback</Text>
          <Text style={styles.feedbackDescription}>
            Tell us about your NaviGO experience and share any ideas you have to help enhance your travel experience.
          </Text>
          <View style={styles.feedbackContainer}>
            <View style={styles.feedbackInputContainer}>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Submit your feedback here..."
                placeholderTextColor={colors.textMuted}
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
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                  <Text style={styles.submitButtonText}>Submit</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadingSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
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
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  noBusesText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  noBusesSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  locationPromptContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  locationPromptText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  enableLocationButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  enableLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerContainer: {
    paddingTop: 52,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: radius.xl,
    borderBottomRightRadius: radius.xl,
    backgroundColor: colors.brand,
    ...shadows.floating,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    flex: 1,
    marginHorizontal: spacing.lg,
    justifyContent: 'center',
  },
  locationStatusDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#00C853',
    marginRight: spacing.sm,
  },
  locationPillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    color: '#333333',
    fontSize: 13,
    marginLeft: spacing.xs,
    fontFamily: 'System',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl * 3,
  },
  welcomeSection: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  greeting: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontFamily: 'System',
    letterSpacing: 0.1,
  },
  welcome: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: spacing.lg,
    color: colors.textPrimary,
    fontFamily: 'System',
    letterSpacing: -1,
    lineHeight: 38,
  },
  quickStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.card,
  },
  quickStatNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  quickStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchSection: {
    marginBottom: spacing.xxl,
  },
  servicesSection: {
    marginBottom: spacing.xxxl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.brand,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderMuted,
    ...shadows.card,
  },
  searchInput: {
    flex: 1,
    height: 56,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
    fontFamily: 'System',
    fontWeight: '400',
  },
  notificationButton: {
    width: 32,
    height: 32,
    marginRight: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  modernServiceCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    minHeight: 132,
    justifyContent: 'space-between',
    ...shadows.card,
  },
  serviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  modernServiceTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    fontFamily: 'System',
    letterSpacing: -0.2,
  },
  modernArrowContainer: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  busesContainer: {
    marginBottom: spacing.xxxl,
  },
  busesScrollContainer: {
    paddingRight: spacing.xl,
    paddingLeft: 0,
  },
  modernBusCard: {
    width: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    marginRight: spacing.lg,
    padding: spacing.xl,
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    ...shadows.floating,
  },
  etaBadgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    ...shadows.card,
  },
  etaBadgeText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: spacing.xs,
    letterSpacing: 0.3,
  },
  modernStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    gap: spacing.xs,
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
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderMuted,
  },
  busIconCircle: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  busMainInfo: {
    flex: 1,
  },
  modernBusNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.5,
  },
  modernRouteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A7F3D0',
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
    backgroundColor: colors.surfaceSubtle,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  infoGridItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
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
    color: colors.textPrimary,
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
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    gap: 8,
    ...shadows.floating,
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
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
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
    color: colors.textMuted,
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
    marginBottom: spacing.xxxl,
    paddingTop: spacing.xl,
    borderTopWidth: 1,
    borderTopColor: colors.borderMuted,
  },
  feedbackDescription: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 24,
    fontFamily: 'System',
    fontWeight: '500',
  },
  feedbackContainer: {
    marginBottom: 20,
  },
  feedbackInputContainer: {
    position: 'relative',
    marginBottom: spacing.lg,
  },
  feedbackInput: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: spacing.xl,
    fontSize: 15,
    color: colors.textPrimary,
    fontFamily: 'System',
    minHeight: 152,
    textAlignVertical: 'top',
    ...shadows.card,
    fontWeight: '500',
  },
  characterCount: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  characterCountText: {
    fontSize: 12,
    color: colors.textMuted,
    fontFamily: 'System',
  },
  submitButton: {
    backgroundColor: colors.brand,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    ...shadows.floating,
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
  emptyBusIllustration: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  emptyBusBody: {
    width: 120,
    height: 64,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 0,
    borderColor: colors.surfaceSubtle,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  emptyBusWheelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 88,
    marginTop: spacing.sm,
  },
  emptyWheel: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.borderSubtle,
  },
}); 
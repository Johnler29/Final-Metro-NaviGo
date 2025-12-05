import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../contexts/SupabaseContext';
import { getAllRoutes } from '../data/routes';
import { supabaseHelpers } from '../lib/supabase';

export default function RouteScreen({ navigation }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [availableRoutes, setAvailableRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const { routes: dbRoutes } = useSupabase();

  // Load routes from Supabase on mount
  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const routes = await getAllRoutes(supabaseHelpers);
      
      // Transform database routes to the format expected by RouteScreen
      const transformedRoutes = routes
        .filter(route => {
          // Only show active routes (or routes without status - default to showing them)
          const routeStatus = route.status;
          return routeStatus === 'active' || !routeStatus;
        })
        .map(route => ({
          id: route.id,
          routeNumber: route.routeNumber || route.route_number || 'N/A',
          origin: route.origin || 'Unknown',
          destination: route.destination || 'Unknown',
          stops: (route.stops || []).map((stop, index) => ({
            name: stop.name || stop.stop_name || `Stop ${index + 1}`,
            time: stop.time || `00:${String(index * 15).padStart(2, '0')}`
          })),
          frequency: route.frequency || 'Every 30 minutes',
          duration: route.estimatedDuration 
            ? `${route.estimatedDuration} minutes` 
            : 'Unknown',
          fare: route.fare 
            ? `₱${parseFloat(route.fare).toFixed(2)}` 
            : 'Free',
          status: route.status || 'active',
        }));
      
      setAvailableRoutes(transformedRoutes);
      console.log('✅ Loaded routes for RouteScreen:', transformedRoutes.length);
    } catch (err) {
      console.error('❌ Error loading routes:', err);
      // Fallback to empty array on error
      setAvailableRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  // Mock route data (fallback - should not be used if database works)
  const mockRoutes = [
    {
      id: '1',
      routeNumber: 'Route 101',
      origin: 'Airport',
      destination: 'Downtown',
      stops: [
        { name: 'Airport Terminal', time: '00:00' },
        { name: 'Central Station', time: '00:15' },
        { name: 'City Hall', time: '00:25' },
        { name: 'Downtown Mall', time: '00:35' },
        { name: 'Downtown Terminal', time: '00:45' },
      ],
      frequency: 'Every 15 minutes',
      duration: '45 minutes',
      fare: '$2.50',
      status: 'active',
    },
    {
      id: '2',
      routeNumber: 'Route 102',
      origin: 'Mall',
      destination: 'University',
      stops: [
        { name: 'Shopping Mall', time: '00:00' },
        { name: 'Library', time: '00:10' },
        { name: 'Hospital', time: '00:20' },
        { name: 'University Campus', time: '00:30' },
      ],
      frequency: 'Every 20 minutes',
      duration: '30 minutes',
      fare: '$2.00',
      status: 'active',
    },
    {
      id: '3',
      routeNumber: 'Route 103',
      origin: 'Station',
      destination: 'Hospital',
      stops: [
        { name: 'Central Station', time: '00:00' },
        { name: 'City Park', time: '00:12' },
        { name: 'Medical Center', time: '00:25' },
        { name: 'General Hospital', time: '00:35' },
      ],
      frequency: 'Every 25 minutes',
      duration: '35 minutes',
      fare: '$2.25',
      status: 'active',
    },
  ];

  const popularDestinations = [
    'Airport', 'Downtown', 'University', 'Hospital', 'Mall', 'Station', 'Beach', 'Park'
  ];

  useEffect(() => {
    if (origin && destination) {
      searchRoutes();
    } else {
      setSearchResults([]);
    }
  }, [origin, destination, availableRoutes]);

  const searchRoutes = () => {
    // Use availableRoutes from database, fallback to mockRoutes if empty
    const routesToSearch = availableRoutes.length > 0 ? availableRoutes : mockRoutes;
    
    const results = routesToSearch.filter(route => 
      route.origin.toLowerCase().includes(origin.toLowerCase()) ||
      route.destination.toLowerCase().includes(destination.toLowerCase()) ||
      route.stops.some(stop => 
        stop.name.toLowerCase().includes(origin.toLowerCase()) ||
        stop.name.toLowerCase().includes(destination.toLowerCase())
      )
    );
    setSearchResults(results);
  };

  const handleRoutePress = (route) => {
    setSelectedRoute(route);
  };

  const handleTrackRoute = (route) => {
    Alert.alert(
      'Track Route',
      `Would you like to track ${route.routeNumber}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Track', 
          onPress: () => navigation.navigate('Map', { selectedRoute: route })
        }
      ]
    );
  };

  const handleQuickSelect = (location) => {
    if (!origin) {
      setOrigin(location);
    } else if (!destination) {
      setDestination(location);
    } else {
      setOrigin(location);
      setDestination('');
    }
  };

  const clearSearch = () => {
    setOrigin('');
    setDestination('');
    setSearchResults([]);
    setSelectedRoute(null);
  };

  const renderRouteCard = (route) => (
    <TouchableOpacity
      key={route.id}
      style={styles.routeCard}
      onPress={() => handleRoutePress(route)}
    >
      <View style={styles.routeHeader}>
        <View style={styles.routeInfo}>
          <Text style={styles.routeNumber}>{route.routeNumber}</Text>
          <Text style={styles.routeDirection}>{route.origin} → {route.destination}</Text>
        </View>
        <View style={styles.routeStatus}>
          <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.statusText}>Active</Text>
        </View>
      </View>

      <View style={styles.routeDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="time" size={16} color="#666" />
            <Text style={styles.detailText}>{route.duration}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="repeat" size={16} color="#666" />
            <Text style={styles.detailText}>{route.frequency}</Text>
          </View>
        </View>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="card" size={16} color="#666" />
            <Text style={styles.detailText}>{route.fare}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="bus" size={16} color="#666" />
            <Text style={styles.detailText}>{route.stops.length} stops</Text>
          </View>
        </View>
      </View>

      <View style={styles.routeStops}>
        <Text style={styles.stopsTitle}>Stops:</Text>
        {route.stops.slice(0, 3).map((stop, index) => (
          <Text key={index} style={styles.stopText}>
            • {stop.name} ({stop.time})
          </Text>
        ))}
        {route.stops.length > 3 && (
          <Text style={styles.moreStops}>+{route.stops.length - 3} more stops</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.trackButton}
        onPress={() => handleTrackRoute(route)}
      >
        <Ionicons name="location" size={16} color="#fff" />
        <Text style={styles.trackButtonText}>Track Route</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Find Routes</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.clearButton} onPress={clearSearch}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.placeholder} />
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Section */}
        <View style={styles.searchSection}>
          <Text style={styles.sectionTitle}>Search Routes</Text>
          <View style={styles.searchInputs}>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="From"
                value={origin}
                onChangeText={setOrigin}
                placeholderTextColor="#999"
              />
            </View>
            <View style={styles.inputContainer}>
              <Ionicons name="location" size={20} color="#666" />
              <TextInput
                style={styles.input}
                placeholder="To"
                value={destination}
                onChangeText={setDestination}
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* Popular Destinations */}
        <View style={styles.popularSection}>
          <Text style={styles.sectionTitle}>Popular Destinations</Text>
          <View style={styles.popularGrid}>
            {popularDestinations.map((dest, index) => (
              <TouchableOpacity
                key={index}
                style={styles.popularButton}
                onPress={() => handleQuickSelect(dest)}
              >
                <Text style={styles.popularButtonText}>{dest}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>
              Found {searchResults.length} route{searchResults.length > 1 ? 's' : ''}
            </Text>
            {searchResults.map(renderRouteCard)}
          </View>
        )}

        {/* All Routes */}
        {searchResults.length === 0 && origin && destination && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>No routes found</Text>
            <Text style={styles.noResultsText}>
              Try different locations or check spelling
            </Text>
          </View>
        )}

        {/* Default Routes */}
        {!origin && !destination && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Available Routes</Text>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f59e0b" />
                <Text style={styles.loadingText}>Loading routes...</Text>
              </View>
            ) : availableRoutes.length > 0 ? (
              availableRoutes.map(renderRouteCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="bus-outline" size={48} color="#ccc" />
                <Text style={styles.emptyText}>No routes available</Text>
                <Text style={styles.emptySubtext}>
                  Routes will appear here once added in the admin panel
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
          <Ionicons name="home" size={24} color="#666" />
          <Text style={styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('BusList')}>
          <Ionicons name="list" size={24} color="#666" />
          <Text style={styles.navText}>Routes</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Map')}>
          <Ionicons name="map" size={24} color="#666" />
          <Text style={styles.navText}>Map</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#666" />
          <Text style={styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerContainer: {
    backgroundColor: '#f59e0b',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
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
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    fontFamily: 'System',
    letterSpacing: -0.8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 44,
    height: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginTop: 24,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  searchInputs: {
    gap: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
    fontFamily: 'System',
    fontWeight: '600',
  },
  popularSection: {
    marginBottom: 25,
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  popularButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  popularButtonText: {
    fontSize: 14,
    color: '#1a1a1a',
    fontFamily: 'System',
    fontWeight: '600',
  },
  resultsSection: {
    marginBottom: 25,
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    fontFamily: 'System',
  },
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 12,
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  routeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  routeInfo: {
    flex: 1,
  },
  routeNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 6,
    fontFamily: 'System',
    letterSpacing: -0.5,
  },
  routeDirection: {
    fontSize: 15,
    color: '#666',
    fontFamily: 'System',
    fontWeight: '600',
  },
  routeStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#d1fae5',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
    fontFamily: 'System',
  },
  routeDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
    fontFamily: 'System',
  },
  routeStops: {
    marginBottom: 15,
  },
  stopsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    fontFamily: 'System',
  },
  stopText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'System',
  },
  moreStops: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    fontFamily: 'System',
  },
  trackButton: {
    backgroundColor: '#f59e0b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 20,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  trackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
    fontFamily: 'System',
    letterSpacing: -0.3,
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 2,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'System',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontFamily: 'System',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    fontFamily: 'System',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontFamily: 'System',
  },
}); 
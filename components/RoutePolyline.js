import React, { useState, useEffect, useRef } from 'react';
import { Polyline, Marker } from 'react-native-maps';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Animated Stop Marker Component
const AnimatedStopMarker = ({ stop, index, onPress, sequence }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    // Start pulse animation
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
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.2,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.stopMarkerContainer}>
      <View style={styles.stopMarker}>
        <Animated.View
          style={[
            styles.stopMarkerPulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: fadeAnim,
            },
          ]}
        />
        <View style={styles.stopMarkerInner}>
          <Ionicons name="location" size={20} color="#F59E0B" />
        </View>
        {sequence !== undefined && (
          <View style={styles.stopSequenceBadge}>
            <Text style={styles.stopSequenceText}>{sequence}</Text>
          </View>
        )}
      </View>
      <View style={styles.stopMarkerLabel}>
        <View style={styles.stopLabelIcon}>
          <Ionicons name="bus-outline" size={12} color="#F59E0B" />
        </View>
        <Text style={styles.stopMarkerText} numberOfLines={1}>
          {stop.name || `Stop ${index + 1}`}
        </Text>
      </View>
    </View>
  );
};

const RoutePolyline = ({ 
  route, 
  isVisible = true, 
  showStops = true, 
  showDirection = true,
  showInfoBubbles = true,
  onStopPress = null,
  isSelected = false
}) => {
  const [showBubble, setShowBubble] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ latitude: 0, longitude: 0 });

  if (!route || !route.coordinates || route.coordinates.length < 2 || !isVisible) {
    return null;
  }

  const { 
    coordinates, 
    stops = [], 
    color = '#3B82F6', 
    strokeWidth = 4,
    estimatedDuration = 0,
    fare = 0,
    name = 'Route'
  } = route;

  // Debug logging
  if (showStops) {
    console.log('📍 RoutePolyline - Route:', route.name);
    console.log('📍 RoutePolyline - showStops:', showStops);
    console.log('📍 RoutePolyline - stops count:', stops.length);
    console.log('📍 RoutePolyline - stops data:', stops);
  }

  // Calculate route segments for different colors (like Google Maps)
  const getRouteSegments = () => {
    if (coordinates.length < 2) return [];
    
    const segments = [];
    const segmentLength = Math.ceil(coordinates.length / 3);
    
    for (let i = 0; i < coordinates.length - 1; i += segmentLength) {
      const endIndex = Math.min(i + segmentLength, coordinates.length - 1);
      segments.push({
        coordinates: coordinates.slice(i, endIndex + 1),
        color: i === 0 ? '#4285F4' : i === segmentLength ? '#FBBC04' : '#34A853' // Blue, Yellow, Green
      });
    }
    
    return segments;
  };

  const routeSegments = getRouteSegments();
  const midPointIndex = Math.floor(coordinates.length / 2);
  const midPoint = coordinates[midPointIndex];

  const handleRoutePress = () => {
    if (showInfoBubbles) {
      setBubblePosition(midPoint);
      setShowBubble(!showBubble);
    }
  };

  return (
    <>
      {/* Custom Start Pin */}
      {coordinates.length > 0 && (
        <Marker
          coordinate={coordinates[0]}
          title={`Start: ${route.name || 'Route'}`}
          description={route.origin || 'Starting point'}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.customPinContainer}>
            <View style={[styles.customPinLabel, styles.startPinLabel]}>
              <Text style={styles.pinLabelText} numberOfLines={1}>
                {route.origin || 'START'}
              </Text>
            </View>
            <View style={[styles.customPin, styles.startPin]}>
              <Ionicons name="location" size={26} color="white" />
            </View>
            <View style={[styles.pinShadow, styles.startPinShadow]} />
          </View>
        </Marker>
      )}

      {/* Stop Markers - Always visible so users can see nearby stops */}
      {showStops && stops.length > 0 && (() => {
        console.log('📍 RoutePolyline - Rendering stops:', stops.length, 'stops for route:', route.name);
        console.log('📍 Stops data:', stops);
        
        return stops.map((stop, index) => {
          // Validate stop has coordinates
          const stopLat = parseFloat(stop.latitude);
          const stopLng = parseFloat(stop.longitude);
          
          if (isNaN(stopLat) || isNaN(stopLng)) {
            console.warn('⚠️ Stop has invalid coordinates:', stop);
            return null;
          }
          
          // Check if this stop matches the start or end coordinates (to avoid duplicate markers)
          // Use a more lenient comparison (0.001 degrees ≈ 111 meters)
          const isStartStop = coordinates.length > 0 && 
            Math.abs(stopLat - coordinates[0].latitude) < 0.001 &&
            Math.abs(stopLng - coordinates[0].longitude) < 0.001;
          const isEndStop = coordinates.length > 0 &&
            Math.abs(stopLat - coordinates[coordinates.length - 1].latitude) < 0.001 &&
            Math.abs(stopLng - coordinates[coordinates.length - 1].longitude) < 0.001;
          
          // Skip if it's the exact same as start/end pin (to avoid duplicates)
          if (isStartStop || isEndStop) {
            console.log('📍 Skipping stop (matches start/end):', stop.name);
            return null;
          }
          
          console.log('📍 Rendering stop marker:', stop.name, 'at', stopLat, stopLng);
          
          return (
            <Marker
              key={stop.id || `stop-${index}`}
              coordinate={{
                latitude: stopLat,
                longitude: stopLng
              }}
              title={stop.name || `Stop ${index + 1}`}
              description={stop.description || stop.address || 'Bus Stop'}
              anchor={{ x: 0.5, y: 0.5 }}
              onPress={() => onStopPress && onStopPress(stop)}
            >
              <AnimatedStopMarker 
                stop={stop} 
                index={index} 
                onPress={onStopPress} 
                sequence={stop.sequence || index + 1}
              />
            </Marker>
          );
        });
      })()}

      {/* Custom End Pin */}
      {coordinates.length > 0 && (
        <Marker
          coordinate={coordinates[coordinates.length - 1]}
          title={`End: ${route.name || 'Route'}`}
          description={route.destination || 'Destination'}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.customPinContainer}>
            <View style={[styles.customPinLabel, styles.endPinLabel]}>
              <Text style={styles.pinLabelText} numberOfLines={1}>
                {route.destination || 'END'}
              </Text>
            </View>
            <View style={[styles.customPin, styles.endPin]}>
              <Ionicons name="flag" size={24} color="white" />
            </View>
            <View style={[styles.pinShadow, styles.endPinShadow]} />
          </View>
        </Marker>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  stopMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  stopMarkerInner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stopMarkerPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F59E0B',
    opacity: 0.2,
    zIndex: 1,
  },
  stopMarkerLabel: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    maxWidth: 120,
    minWidth: 60,
    borderWidth: 2,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stopLabelIcon: {
    marginRight: 2,
  },
  stopMarkerText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  stopSequenceBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 5,
    zIndex: 10,
  },
  stopSequenceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  endpointMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  customPinContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  customPinLabel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
    maxWidth: 140,
    minWidth: 80,
  },
  startPinLabel: {
    backgroundColor: '#10B981',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  endPinLabel: {
    backgroundColor: '#EF4444',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  pinLabelText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  customPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 1,
  },
  startPin: {
    backgroundColor: '#10B981',
    borderColor: 'white',
  },
  endPin: {
    backgroundColor: '#EF4444',
    borderColor: 'white',
  },
  pinShadow: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    opacity: 0.25,
    zIndex: 0,
    bottom: -6,
  },
  startPinShadow: {
    backgroundColor: '#10B981',
  },
  endPinShadow: {
    backgroundColor: '#EF4444',
  },
  infoBubble: {
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  bubbleContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 6,
  },
  bubbleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    fontWeight: '500',
  },
  bubbleArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
});

export default RoutePolyline;
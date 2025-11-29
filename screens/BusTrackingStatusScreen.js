/**
 * Bus Tracking Status Screen
 * 
 * Visual diagnostic screen for checking bus tracking status
 * No console logs needed - everything is visible on screen
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useSupabase } from '../contexts/SupabaseContext';

export default function BusTrackingStatusScreen({ navigation }) {
  const { supabase, buses, updateBusLocation } = useSupabase();
  const [statusData, setStatusData] = useState({
    driverSession: null,
    busInfo: null,
    locationStatus: null,
    databaseStatus: null,
    lastUpdate: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const loadStatus = async () => {
    try {
      // Load driver session
      const sessionData = await AsyncStorage.getItem('driverSession');
      let session = null;
      if (sessionData) {
        session = JSON.parse(sessionData);
      }

      // Get bus info
      let busInfo = null;
      if (session?.bus_id && supabase) {
        const { data, error } = await supabase
          .from('buses')
          .select('*')
          .eq('id', session.bus_id)
          .single();
        
        if (!error && data) {
          busInfo = data;
        }
      }

      // Check location permissions
      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      const servicesEnabled = await Location.hasServicesEnabledAsync();

      // Get current location
      let location = null;
      try {
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          maximumAge: 10000,
          timeout: 5000,
        });
        setCurrentLocation(location);
      } catch (locError) {
        console.log('Location fetch error:', locError);
      }

      // Check database status
      let dbStatus = 'unknown';
      if (supabase && busInfo) {
        const minutesSinceUpdate = busInfo.last_location_update
          ? Math.round((Date.now() - new Date(busInfo.last_location_update).getTime()) / 60000)
          : null;
        
        dbStatus = {
          hasCoordinates: busInfo.latitude != null && busInfo.longitude != null,
          lastUpdate: busInfo.last_location_update,
          minutesSinceUpdate,
          status: busInfo.status,
          trackingStatus: busInfo.tracking_status,
        };
      }

      setStatusData({
        driverSession: session,
        busInfo,
        locationStatus: {
          permission: permStatus,
          servicesEnabled,
          currentLocation: location ? {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy,
          } : null,
        },
        databaseStatus: dbStatus,
        lastUpdate: new Date().toISOString(),
      });
    } catch (error) {
      Alert.alert('Error', `Failed to load status: ${error.message}`);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStatus();
    setRefreshing(false);
  };

  const testLocationUpdate = async () => {
    if (!statusData.driverSession?.bus_id || !currentLocation) {
      Alert.alert('Error', 'Cannot test: Missing bus ID or current location');
      return;
    }

    Alert.alert(
      'Test Location Update',
      'This will send your current location to the server. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test',
          onPress: async () => {
            try {
              const result = await updateBusLocation({
                busId: statusData.driverSession.bus_id,
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                accuracy: currentLocation.coords.accuracy,
                speed: currentLocation.coords.speed ? currentLocation.coords.speed * 3.6 : null,
              });

              if (result?.success !== false) {
                Alert.alert('Success', 'Location update sent successfully!');
                await loadStatus();
              } else {
                Alert.alert('Error', result.error || 'Location update failed');
              }
            } catch (error) {
              Alert.alert('Error', `Failed to send location: ${error.message}`);
            }
          },
        },
      ]
    );
  };

  const StatusCard = ({ title, icon, status, children, color = '#4CAF50' }) => (
    <View style={styles.statusCard}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: color }]} />
      </View>
      {children}
    </View>
  );

  const StatusItem = ({ label, value, status = 'info' }) => {
    const colors = {
      success: '#4CAF50',
      warning: '#FF9800',
      error: '#F44336',
      info: '#2196F3',
    };

    return (
      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>{label}:</Text>
        <Text style={[styles.statusValue, { color: colors[status] || colors.info }]}>
          {value}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tracking Status</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Driver Session Status */}
        <StatusCard
          title="Driver Session"
          icon="person-circle"
          color={statusData.driverSession ? '#4CAF50' : '#F44336'}
        >
          {statusData.driverSession ? (
            <>
              <StatusItem label="Session ID" value={statusData.driverSession.id?.substring(0, 8) + '...'} />
              <StatusItem label="Driver ID" value={statusData.driverSession.driver_id?.substring(0, 8) + '...'} />
              <StatusItem label="Bus ID" value={statusData.driverSession.bus_id?.substring(0, 8) + '...'} />
              <StatusItem
                label="Status"
                value={statusData.driverSession.status || 'unknown'}
                status={statusData.driverSession.status === 'active' ? 'success' : 'warning'}
              />
            </>
          ) : (
            <Text style={styles.errorText}>No driver session found</Text>
          )}
        </StatusCard>

        {/* Bus Info */}
        {statusData.busInfo && (
          <StatusCard
            title="Bus Information"
            icon="bus"
            color={statusData.busInfo.status === 'active' ? '#4CAF50' : '#FF9800'}
          >
            <StatusItem label="Bus Number" value={statusData.busInfo.bus_number || 'N/A'} />
            <StatusItem
              label="Status"
              value={statusData.busInfo.status || 'unknown'}
              status={statusData.busInfo.status === 'active' ? 'success' : 'warning'}
            />
            <StatusItem
              label="Tracking Status"
              value={statusData.busInfo.tracking_status || 'unknown'}
            />
            <StatusItem
              label="Coordinates"
              value={
                statusData.busInfo.latitude && statusData.busInfo.longitude
                  ? `${statusData.busInfo.latitude.toFixed(6)}, ${statusData.busInfo.longitude.toFixed(6)}`
                  : 'NULL'
              }
              status={
                statusData.busInfo.latitude && statusData.busInfo.longitude ? 'success' : 'error'
              }
            />
          </StatusCard>
        )}

        {/* Location Status */}
        <StatusCard
          title="GPS Location"
          icon="location"
          color={
            statusData.locationStatus?.permission === 'granted' &&
            statusData.locationStatus?.servicesEnabled
              ? '#4CAF50'
              : '#F44336'
          }
        >
          <StatusItem
            label="Permission"
            value={statusData.locationStatus?.permission || 'unknown'}
            status={statusData.locationStatus?.permission === 'granted' ? 'success' : 'error'}
          />
          <StatusItem
            label="Services Enabled"
            value={statusData.locationStatus?.servicesEnabled ? 'Yes' : 'No'}
            status={statusData.locationStatus?.servicesEnabled ? 'success' : 'error'}
          />
          {statusData.locationStatus?.currentLocation ? (
            <>
              <StatusItem
                label="Current Lat"
                value={statusData.locationStatus.currentLocation.latitude.toFixed(6)}
                status="success"
              />
              <StatusItem
                label="Current Lng"
                value={statusData.locationStatus.currentLocation.longitude.toFixed(6)}
                status="success"
              />
              <StatusItem
                label="Accuracy"
                value={`${Math.round(statusData.locationStatus.currentLocation.accuracy)}m`}
                status={
                  statusData.locationStatus.currentLocation.accuracy <= 20 ? 'success' : 'warning'
                }
              />
            </>
          ) : (
            <Text style={styles.errorText}>No current location available</Text>
          )}
        </StatusCard>

        {/* Database Status */}
        {statusData.databaseStatus !== 'unknown' && (
          <StatusCard
            title="Database Status"
            icon="server"
            color={
              statusData.databaseStatus?.hasCoordinates &&
              statusData.databaseStatus?.minutesSinceUpdate !== null &&
              statusData.databaseStatus?.minutesSinceUpdate < 2
                ? '#4CAF50'
                : '#FF9800'
            }
          >
            <StatusItem
              label="Has Coordinates"
              value={statusData.databaseStatus?.hasCoordinates ? 'Yes' : 'No'}
              status={statusData.databaseStatus?.hasCoordinates ? 'success' : 'error'}
            />
            <StatusItem
              label="Last Update"
              value={
                statusData.databaseStatus?.lastUpdate
                  ? new Date(statusData.databaseStatus.lastUpdate).toLocaleString()
                  : 'Never'
              }
            />
            <StatusItem
              label="Minutes Ago"
              value={
                statusData.databaseStatus?.minutesSinceUpdate !== null
                  ? `${statusData.databaseStatus.minutesSinceUpdate} min`
                  : 'N/A'
              }
              status={
                statusData.databaseStatus?.minutesSinceUpdate !== null &&
                statusData.databaseStatus.minutesSinceUpdate < 2
                  ? 'success'
                  : 'warning'
              }
            />
            <StatusItem
              label="Bus Status"
              value={statusData.databaseStatus?.status || 'unknown'}
              status={statusData.databaseStatus?.status === 'active' ? 'success' : 'warning'}
            />
          </StatusCard>
        )}

        {/* Test Button */}
        {statusData.driverSession && currentLocation && (
          <TouchableOpacity style={styles.testButton} onPress={testLocationUpdate}>
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.testButtonText}>Test Location Update</Text>
          </TouchableOpacity>
        )}

        {/* Last Update Time */}
        <Text style={styles.lastUpdate}>
          Last updated: {statusData.lastUpdate ? new Date(statusData.lastUpdate).toLocaleTimeString() : 'Never'}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f59e0b',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 5,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
    flex: 1,
  },
  statusBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 10,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    padding: 15,
    margin: 15,
    borderRadius: 12,
    elevation: 2,
  },
  testButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  lastUpdate: {
    textAlign: 'center',
    color: '#999',
    fontSize: 12,
    marginBottom: 20,
    marginTop: 10,
  },
});


// Driver background tasks for reliable location tracking while app is in background
// Uses Expo's TaskManager + Location APIs so tracking continues when the app is minimized
// or the device is locked, with battery‑aware settings.

import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabaseHelpers } from '../lib/supabase';

// Unique name for the background location task
export const DRIVER_BACKGROUND_LOCATION_TASK = 'DRIVER_BACKGROUND_LOCATION_TASK';

// Storage key that keeps lightweight context the task needs (e.g. bus id)
const DRIVER_BACKGROUND_CONTEXT_KEY = 'driverBackgroundContext';
const DRIVER_TRACKING_CHANNEL_ID = 'driver-background-tracking';
const DUTY_STATES_ALLOWED = new Set(['on_duty', 'on_trip', 'active']);

const ensureAndroidNotificationPermissionAsync = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions?.status === 'granted' || permissions?.status === 'provisional') {
      return true;
    }
    const requested = await Notifications.requestPermissionsAsync();
    const granted = requested?.status === 'granted' || requested?.status === 'provisional';
    if (!granted) {
      console.warn('⚠️ Driver background tracking notification permission denied on Android');
    }
    return granted;
  } catch (permissionError) {
    console.warn('⚠️ Failed to ensure driver notification permission:', permissionError?.message || permissionError);
    return false;
  }
};

const ensureAndroidNotificationChannelAsync = async () => {
  if (Platform.OS !== 'android') {
    return true;
  }
  try {
    // Create notification channel with HIGH importance (MAX can be too aggressive)
    // HIGH is sufficient for persistent foreground service notifications
    await Notifications.setNotificationChannelAsync(DRIVER_TRACKING_CHANNEL_ID, {
      name: 'Driver Location Tracking',
      description: 'Shows when your bus location is being tracked while on duty.',
      importance: Notifications.AndroidImportance.HIGH,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      sound: null,
      vibrationPattern: null,
      bypassDnd: false,
      showBadge: true,
    });
    console.log('✅ Notification channel created/updated:', DRIVER_TRACKING_CHANNEL_ID);
    return true;
  } catch (channelError) {
    console.error('❌ Failed to configure background tracking channel:', channelError?.message || channelError);
    return false;
  }
};

const readBackgroundContextAsync = async () => {
  const rawContext = await AsyncStorage.getItem(DRIVER_BACKGROUND_CONTEXT_KEY);
  return rawContext ? JSON.parse(rawContext) : null;
};

const persistBackgroundContextAsync = async (partialContext) => {
  const existing = (await readBackgroundContextAsync()) || {};
  const nextContext = {
    ...existing,
    ...partialContext,
    updatedAt: Date.now(),
    version: 2,
  };
  await AsyncStorage.setItem(
    DRIVER_BACKGROUND_CONTEXT_KEY,
    JSON.stringify(nextContext),
  );
  return nextContext;
};

// Define the background task exactly once at module load.
// This code runs in a separate context from React components.
TaskManager.defineTask(DRIVER_BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  try {
    if (error) {
      console.error('❌ Driver background location task error:', error);
      return;
    }

    const locations = data?.locations;
    if (!locations || locations.length === 0) {
      return;
    }

    // Use the most recent location sample
    const latest = locations[locations.length - 1];
    const coords = latest?.coords || {};

    const latitude = coords.latitude;
    const longitude = coords.longitude;
    const accuracy = coords.accuracy;
    const speedMs = coords.speed;

    // Validate coordinates before sending anything to the backend
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      console.warn('⚠️ Background task received invalid coordinates, skipping update');
      return;
    }

    // Load the last known driver/bus context so we know which bus to update
    const context = await readBackgroundContextAsync();
    if (!context) {
      console.log('ℹ️ No driver background context found, skipping location update');
      return;
    }

    const busId = context?.busId;
    const dutyStatus = context?.dutyStatus || 'unknown';
    if (!DUTY_STATES_ALLOWED.has(dutyStatus)) {
      console.log('ℹ️ Driver duty status is not active, skipping update:', dutyStatus);
      return;
    }

    if (!busId) {
      console.log('ℹ️ Background context missing busId, skipping update');
      return;
    }

    // Convert speed from m/s (native) to km/h expected by backend helper
    const speedKmh = typeof speedMs === 'number' && Number.isFinite(speedMs)
      ? speedMs * 3.6
      : null;

    // Send a lightweight location payload using the existing Supabase helper
    await supabaseHelpers.updateBusLocation({
      busId,
      latitude,
      longitude,
      accuracy: typeof accuracy === 'number' ? accuracy : 10,
      speed: speedKmh,
    });

    console.log('✅ Driver background location update sent:', {
      busId,
      latitude,
      longitude,
      accuracy,
      speedKmh,
      dutyStatus,
    });
  } catch (taskError) {
    // Never throw from a background task — always catch and log
    console.error('❌ Unhandled error in driver background location task:', taskError);
  }
});

// Request foreground + background permissions in a battery‑safe, user‑friendly way
const ensureLocationPermissionsAsync = async () => {
  // Foreground permission is always required
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') {
    console.warn('⚠️ Foreground location permission not granted for driver background tracking');
    return false;
  }

  // Background permission is platform‑specific
  let bgStatus = 'granted';
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    bgStatus = bg.status;
  } catch (e) {
    console.warn('⚠️ requestBackgroundPermissionsAsync not available:', e?.message || e);
  }

  if (bgStatus !== 'granted') {
    console.warn('⚠️ Background location permission not granted');
    return false;
  }

  return true;
};

// Start background location tracking for the current driver/bus.
// Call this when a driver goes "on duty" / starts a trip.
export const enableDriverBackgroundTracking = async ({ busId, dutyStatus = 'on_trip' } = {}) => {
  try {
    if (!busId) {
      console.warn('⚠️ enableDriverBackgroundTracking called without busId');
      return { success: false, error: 'Missing busId' };
    }

    console.log('🚀 Enabling driver background tracking for bus:', busId);

    // Step 1: Ensure notification permission (required for foreground service)
    const hasNotificationPermission = await ensureAndroidNotificationPermissionAsync();
    if (!hasNotificationPermission) {
      const error = 'Notification permission missing, cannot start foreground service';
      console.error('❌', error);
      return { success: false, error };
    }
    console.log('✅ Notification permission granted');

    // Step 2: Create notification channel (required for foreground service notification)
    const channelReady = await ensureAndroidNotificationChannelAsync();
    if (!channelReady) {
      const error = 'Notification channel setup failed';
      console.error('❌', error);
      return { success: false, error };
    }
    console.log('✅ Notification channel ready');

    // Step 3: Ensure location permissions (foreground + background)
    const hasPermission = await ensureLocationPermissionsAsync();
    if (!hasPermission) {
      const error = 'Location permissions not granted';
      console.error('❌', error);
      return { success: false, error };
    }
    console.log('✅ Location permissions granted');

    // Step 4: Persist context so task can access busId and duty status
    await persistBackgroundContextAsync({
      busId,
      dutyStatus: DUTY_STATES_ALLOWED.has(dutyStatus) ? dutyStatus : 'on_trip',
    });
    console.log('✅ Background context persisted');

    // Step 5: Check if already started (avoid duplicate starts)
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    );

    if (alreadyStarted) {
      console.log('ℹ️ Background location tracking already active, updating context only');
      return { success: true, alreadyActive: true };
    }

    // Step 6: Start location updates with foreground service configuration
    console.log('📍 Starting location updates with foreground service...');
    
    const locationConfig = {
      accuracy: Location.Accuracy.Balanced,
      // Update when driver moves at least 10 meters (reduced from 20 for better tracking)
      distanceInterval: 10,
      // Update at most every 10 seconds
      timeInterval: 10000,
      deferredUpdatesInterval: 10000,
      deferredUpdatesDistance: 10,
      deferredUpdatesTimeout: 60000,
      // iOS: show the blue bar indicator
      showsBackgroundLocationIndicator: true,
      // iOS: allow OS to pause when stationary
      pausesUpdatesAutomatically: false, // Changed to false to ensure continuous tracking
      activityType: Location.ActivityType.AutomotiveNavigation,
    };

    // Android-specific: Add foreground service configuration
    if (Platform.OS === 'android') {
      locationConfig.foregroundService = {
        notificationTitle: 'Metro NaviGo – On Duty',
        notificationBody: 'Tracking your bus location while on duty',
        notificationColor: '#f59e0b',
        notificationChannelId: DRIVER_TRACKING_CHANNEL_ID,
      };
      console.log('📱 Android foreground service configured');
    }

    await Location.startLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK, locationConfig);

    // Verify it actually started
    const verifyStarted = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    );

    if (verifyStarted) {
      console.log('✅ Driver background location tracking started successfully');
      return { success: true };
    } else {
      const error = 'Location tracking failed to start (verification failed)';
      console.error('❌', error);
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error?.message || String(error);
    console.error('❌ Failed to enable driver background tracking:', errorMsg, error);
    return { success: false, error: errorMsg };
  }
};

// Stop background location tracking and clear persisted context.
// Call this when a driver ends a trip or goes off duty.
export const stopDriverBackgroundTracking = async () => {
  try {
    console.log('🛑 Stopping driver background tracking');

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    );

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(DRIVER_BACKGROUND_LOCATION_TASK);
    }

    await AsyncStorage.removeItem(DRIVER_BACKGROUND_CONTEXT_KEY);

    console.log('✅ Driver background tracking stopped and context cleared');
  } catch (error) {
    console.error('❌ Failed to stop driver background tracking:', error);
  }
};

export const setDriverBackgroundDutyStatus = async (dutyStatus) => {
  if (!dutyStatus) {
    return;
  }
  try {
    await persistBackgroundContextAsync({ dutyStatus });
  } catch (error) {
    console.warn('⚠️ Failed to persist driver duty status:', error?.message || error);
  }
};

// On app startup, try to re‑attach to any previously running background task.
// This helps recover after the OS kills the process or the app is relaunched.
export const restoreDriverBackgroundTrackingIfNeeded = async () => {
  try {
    const context = await readBackgroundContextAsync();
    if (!context) {
      return;
    }

    const busId = context?.busId;

    if (!busId) {
      return;
    }

    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      DRIVER_BACKGROUND_LOCATION_TASK,
    );

    if (hasStarted) {
      console.log('ℹ️ Background tracking already running on startup');
      return;
    }

    console.log('🔁 Restoring driver background tracking from stored context for bus:', busId);
    await enableDriverBackgroundTracking({
      busId,
      dutyStatus: context?.dutyStatus || 'on_trip',
    });
  } catch (error) {
    console.error('❌ Failed to restore driver background tracking:', error);
  }
};



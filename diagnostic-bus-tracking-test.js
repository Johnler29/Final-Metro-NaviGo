/**
 * Comprehensive Bus Tracking Diagnostic Test
 * 
 * This script checks all components of the bus tracking system to identify
 * why buses aren't showing on the map when drivers go on duty and why
 * coordinates are NULL.
 * 
 * Run this in your React Native debugger console or as a standalone test.
 */

const diagnosticTest = {
  results: [],
  errors: [],
  warnings: [],

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.push(logEntry);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
    
    if (type === 'error') this.errors.push(logEntry);
    if (type === 'warning') this.warnings.push(logEntry);
  },

  async test1_DatabaseConnection() {
    this.log('=== TEST 1: Database Connection ===', 'info');
    try {
      const { createClient } = require('@supabase/supabase-js');
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Load environment variables
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        this.log('❌ Missing Supabase credentials in environment variables', 'error');
        return false;
      }
      
      this.log(`✅ Supabase URL configured: ${supabaseUrl.substring(0, 30)}...`, 'info');
      this.log(`✅ Supabase Key configured: ${supabaseKey.substring(0, 20)}...`, 'info');
      
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Test connection
      const { data, error } = await supabase.from('buses').select('id').limit(1);
      
      if (error) {
        this.log(`❌ Database connection failed: ${error.message}`, 'error');
        return false;
      }
      
      this.log('✅ Database connection successful', 'info');
      return { success: true, supabase };
    } catch (error) {
      this.log(`❌ Database connection test failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test2_BusStatusAndCoordinates(supabase) {
    this.log('\n=== TEST 2: Bus Status and Coordinates ===', 'info');
    try {
      // Check all buses with drivers
      const { data: buses, error } = await supabase
        .from('buses')
        .select(`
          id,
          bus_number,
          driver_id,
          status,
          latitude,
          longitude,
          tracking_status,
          last_location_update,
          updated_at,
          created_at
        `)
        .not('driver_id', 'is', null)
        .order('updated_at', { ascending: false });

      if (error) {
        this.log(`❌ Failed to fetch buses: ${error.message}`, 'error');
        return false;
      }

      this.log(`Found ${buses.length} bus(es) with assigned drivers`, 'info');

      buses.forEach(bus => {
        const minutesSinceUpdate = bus.last_location_update 
          ? Math.round((Date.now() - new Date(bus.last_location_update).getTime()) / 60000)
          : 'N/A';
        
        const minutesSinceUpdatedAt = bus.updated_at
          ? Math.round((Date.now() - new Date(bus.updated_at).getTime()) / 60000)
          : 'N/A';

        this.log(`\n--- Bus: ${bus.bus_number} ---`, 'info');
        this.log(`  Driver ID: ${bus.driver_id}`, 'info');
        this.log(`  Status: ${bus.status} ${bus.status !== 'active' ? '⚠️ SHOULD BE ACTIVE' : ''}`, 
          bus.status !== 'active' ? 'warning' : 'info');
        this.log(`  Tracking Status: ${bus.tracking_status || 'NULL'}`, 'info');
        this.log(`  Latitude: ${bus.latitude ?? 'NULL'} ${bus.latitude === null ? '⚠️' : ''}`, 
          bus.latitude === null ? 'warning' : 'info');
        this.log(`  Longitude: ${bus.longitude ?? 'NULL'} ${bus.longitude === null ? '⚠️' : ''}`, 
          bus.longitude === null ? 'warning' : 'info');
        this.log(`  Last Location Update: ${bus.last_location_update ? new Date(bus.last_location_update).toLocaleString() : 'NULL'} (${minutesSinceUpdate} min ago)`, 
          !bus.last_location_update || minutesSinceUpdate > 2 ? 'warning' : 'info');
        this.log(`  Updated At: ${bus.updated_at ? new Date(bus.updated_at).toLocaleString() : 'NULL'} (${minutesSinceUpdatedAt} min ago)`, 'info');

        // Check visibility conditions
        const hasActiveDriver = bus.driver_id && bus.status === 'active';
        const hasValidCoordinates = bus.latitude && bus.longitude && 
          !isNaN(bus.latitude) && !isNaN(bus.longitude);
        const hasRecentLocation = bus.last_location_update && 
          new Date(bus.last_location_update) > new Date(Date.now() - 10 * 60 * 1000);
        const justWentOnDuty = bus.updated_at && 
          new Date(bus.updated_at) > new Date(Date.now() - 2 * 60 * 1000);

        this.log(`  Visibility Check:`, 'info');
        this.log(`    - Has Active Driver: ${hasActiveDriver} ${!hasActiveDriver ? '❌' : '✅'}`, 
          hasActiveDriver ? 'info' : 'error');
        this.log(`    - Has Valid Coordinates: ${hasValidCoordinates} ${!hasValidCoordinates ? '⚠️' : '✅'}`, 
          hasValidCoordinates ? 'info' : 'warning');
        this.log(`    - Has Recent Location: ${hasRecentLocation} ${!hasRecentLocation ? '⚠️' : '✅'}`, 
          hasRecentLocation ? 'info' : 'warning');
        this.log(`    - Just Went On Duty: ${justWentOnDuty} ${!justWentOnDuty ? '⚠️' : '✅'}`, 
          justWentOnDuty ? 'info' : 'warning');

        const shouldAppear = hasActiveDriver && (hasValidCoordinates || hasRecentLocation || justWentOnDuty);
        this.log(`    - SHOULD APPEAR ON MAP: ${shouldAppear ? '✅ YES' : '❌ NO'}`, 
          shouldAppear ? 'info' : 'error');
      });

      return { success: true, buses };
    } catch (error) {
      this.log(`❌ Bus status check failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test3_RPCFunctionExists(supabase) {
    this.log('\n=== TEST 3: RPC Function Check ===', 'info');
    try {
      // Test if the RPC function exists by calling it with test data
      const { data, error } = await supabase.rpc('update_bus_location_simple', {
        p_bus_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        p_latitude: 0.0,
        p_longitude: 0.0,
        p_accuracy: 10.0,
        p_speed_kmh: 0.0
      });

      if (error) {
        if (error.message.includes('function') || error.message.includes('does not exist')) {
          this.log(`❌ RPC function 'update_bus_location_simple' does not exist!`, 'error');
          this.log(`   Error: ${error.message}`, 'error');
          return false;
        } else if (error.message.includes('not found')) {
          this.log(`✅ RPC function exists (test bus not found is expected)`, 'info');
          return true;
        } else {
          this.log(`⚠️ RPC function test returned unexpected error: ${error.message}`, 'warning');
          return true; // Function exists, but returned error for test data
        }
      }

      this.log('✅ RPC function exists and is callable', 'info');
      return true;
    } catch (error) {
      this.log(`❌ RPC function test failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test4_DriverSessionCheck() {
    this.log('\n=== TEST 4: Driver Session Check ===', 'info');
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      const sessionData = await AsyncStorage.getItem('driverSession');
      
      if (!sessionData) {
        this.log('❌ No driver session found in AsyncStorage', 'error');
        this.log('   This means the driver has not started a trip or the session was cleared', 'warning');
        return false;
      }

      const session = JSON.parse(sessionData);
      this.log('✅ Driver session found in AsyncStorage', 'info');
      this.log(`   Session ID: ${session.id}`, 'info');
      this.log(`   Driver ID: ${session.driver_id}`, 'info');
      this.log(`   Bus ID: ${session.bus_id}`, 'info');
      this.log(`   Status: ${session.status || 'unknown'}`, 'info');
      this.log(`   Started At: ${session.started_at ? new Date(session.started_at).toLocaleString() : 'N/A'}`, 'info');

      // Check if session is still valid in database
      const { createClient } = require('@supabase/supabase-js');
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data: dbSession, error: sessionError } = await supabase
        .from('driver_sessions')
        .select('*')
        .eq('id', session.id)
        .single();

      if (sessionError || !dbSession) {
        this.log('⚠️ Driver session not found in database (may have expired or been deleted)', 'warning');
        return { success: false, session: session };
      }

      this.log('✅ Driver session found in database', 'info');
      this.log(`   Database Status: ${dbSession.status}`, 'info');
      
      if (dbSession.status !== 'active') {
        this.log(`⚠️ Session status is '${dbSession.status}' but should be 'active'`, 'warning');
      }

      return { success: true, session, dbSession };
    } catch (error) {
      this.log(`❌ Driver session check failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test5_LocationPermissions() {
    this.log('\n=== TEST 5: Location Permissions ===', 'info');
    try {
      const { requestForegroundPermissionsAsync, getForegroundPermissionsAsync, hasServicesEnabledAsync } = 
        require('expo-location').default;

      // Check if location services are enabled
      const servicesEnabled = await hasServicesEnabledAsync();
      this.log(`Location Services Enabled: ${servicesEnabled ? '✅ YES' : '❌ NO'}`, 
        servicesEnabled ? 'info' : 'error');

      if (!servicesEnabled) {
        this.log('⚠️ Location services are disabled on the device', 'warning');
        return false;
      }

      // Check current permission status
      const { status } = await getForegroundPermissionsAsync();
      this.log(`Current Permission Status: ${status}`, 
        status === 'granted' ? 'info' : 'warning');

      if (status !== 'granted') {
        this.log('⚠️ Location permission not granted. Requesting...', 'warning');
        const { status: newStatus } = await requestForegroundPermissionsAsync();
        this.log(`New Permission Status: ${newStatus}`, 
          newStatus === 'granted' ? 'info' : 'error');
        
        if (newStatus !== 'granted') {
          this.log('❌ Location permission denied', 'error');
          return false;
        }
      }

      this.log('✅ Location permissions are granted', 'info');
      return true;
    } catch (error) {
      this.log(`❌ Location permissions check failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test6_LocationAPI() {
    this.log('\n=== TEST 6: Location API Test ===', 'info');
    try {
      const Location = require('expo-location').default;

      this.log('Requesting current location...', 'info');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000
      });

      if (!location || !location.coords) {
        this.log('❌ Location API returned null or invalid response', 'error');
        return false;
      }

      const { latitude, longitude, accuracy, speed, heading } = location.coords;

      this.log('✅ Location API returned coordinates', 'info');
      this.log(`   Latitude: ${latitude}`, 'info');
      this.log(`   Longitude: ${longitude}`, 'info');
      this.log(`   Accuracy: ${accuracy ? `${accuracy.toFixed(1)}m` : 'N/A'}`, 'info');
      this.log(`   Speed: ${speed ? `${(speed * 3.6).toFixed(1)} km/h` : 'N/A'}`, 'info');
      this.log(`   Heading: ${heading ? `${heading.toFixed(1)}°` : 'N/A'}`, 'info');

      // Validate coordinates
      const isLatValid = typeof latitude === 'number' && Number.isFinite(latitude) && !isNaN(latitude);
      const isLngValid = typeof longitude === 'number' && Number.isFinite(longitude) && !isNaN(longitude);

      if (!isLatValid || !isLngValid) {
        this.log('❌ Invalid coordinates received from Location API', 'error');
        this.log(`   Latitude valid: ${isLatValid}, Longitude valid: ${isLngValid}`, 'error');
        return false;
      }

      // Check coordinate ranges
      if (latitude < -90 || latitude > 90) {
        this.log(`❌ Invalid latitude range: ${latitude}`, 'error');
        return false;
      }
      if (longitude < -180 || longitude > 180) {
        this.log(`❌ Invalid longitude range: ${longitude}`, 'error');
        return false;
      }

      this.log('✅ Coordinates are valid', 'info');
      return { success: true, location };
    } catch (error) {
      this.log(`❌ Location API test failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test7_UpdateBusLocationFlow(supabase, busId, testLocation) {
    this.log('\n=== TEST 7: Bus Location Update Flow ===', 'info');
    try {
      if (!busId) {
        this.log('⚠️ No bus ID provided, skipping update test', 'warning');
        return false;
      }

      if (!testLocation || !testLocation.latitude || !testLocation.longitude) {
        this.log('⚠️ No valid test location provided, skipping update test', 'warning');
        return false;
      }

      this.log(`Testing location update for bus: ${busId}`, 'info');
      this.log(`Test coordinates: ${testLocation.latitude}, ${testLocation.longitude}`, 'info');

      // Simulate the update using the RPC function
      const { data, error } = await supabase.rpc('update_bus_location_simple', {
        p_bus_id: busId,
        p_latitude: parseFloat(testLocation.latitude),
        p_longitude: parseFloat(testLocation.longitude),
        p_accuracy: testLocation.accuracy ? parseFloat(testLocation.accuracy) : 10.0,
        p_speed_kmh: testLocation.speed ? parseFloat(testLocation.speed) : null
      });

      if (error) {
        this.log(`❌ Location update failed: ${error.message}`, 'error');
        this.log(`   Error code: ${error.code}`, 'error');
        this.log(`   Error details: ${JSON.stringify(error)}`, 'error');
        return false;
      }

      if (!data) {
        this.log('❌ Location update returned no data', 'error');
        return false;
      }

      if (data.success === false) {
        this.log(`❌ Location update rejected: ${data.message || 'Unknown reason'}`, 'error');
        return false;
      }

      this.log('✅ Location update successful', 'info');
      this.log(`   Response: ${JSON.stringify(data)}`, 'info');

      // Verify the update in the database
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const { data: updatedBus, error: fetchError } = await supabase
        .from('buses')
        .select('latitude, longitude, last_location_update')
        .eq('id', busId)
        .single();

      if (fetchError) {
        this.log(`⚠️ Could not verify update: ${fetchError.message}`, 'warning');
        return true; // Update may have succeeded but fetch failed
      }

      const latMatch = Math.abs(updatedBus.latitude - testLocation.latitude) < 0.0001;
      const lngMatch = Math.abs(updatedBus.longitude - testLocation.longitude) < 0.0001;

      if (latMatch && lngMatch) {
        this.log('✅ Location update verified in database', 'info');
        this.log(`   Stored coordinates: ${updatedBus.latitude}, ${updatedBus.longitude}`, 'info');
        this.log(`   Last update: ${new Date(updatedBus.last_location_update).toLocaleString()}`, 'info');
      } else {
        this.log('⚠️ Location update may not have saved correctly', 'warning');
        this.log(`   Expected: ${testLocation.latitude}, ${testLocation.longitude}`, 'warning');
        this.log(`   Stored: ${updatedBus.latitude}, ${updatedBus.longitude}`, 'warning');
      }

      return true;
    } catch (error) {
      this.log(`❌ Location update flow test failed: ${error.message}`, 'error');
      return false;
    }
  },

  async test8_MapDisplayLogic(supabase) {
    this.log('\n=== TEST 8: Map Display Logic ===', 'info');
    try {
      // Get all buses that should appear on map
      const { data: allBuses, error } = await supabase
        .from('buses')
        .select('*')
        .not('driver_id', 'is', null);

      if (error) {
        this.log(`❌ Failed to fetch buses: ${error.message}`, 'error');
        return false;
      }

      this.log(`Analyzing ${allBuses.length} bus(es) for map display...`, 'info');

      const visibleBuses = [];
      const hiddenBuses = [];

      allBuses.forEach(bus => {
        // Replicate the logic from RealtimeBusMap.js
        const hasActiveDriver = bus.driver_id && bus.status === 'active';
        const hasValidCoordinates = bus.latitude && bus.longitude && 
          !isNaN(bus.latitude) && !isNaN(bus.longitude);
        const hasRecentLocation = bus.last_location_update && 
          new Date(bus.last_location_update) > new Date(Date.now() - 10 * 60 * 1000);
        const justWentOnDuty = bus.updated_at && 
          new Date(bus.updated_at) > new Date(Date.now() - 2 * 60 * 1000);

        const shouldShow = hasActiveDriver && (hasValidCoordinates || hasRecentLocation || justWentOnDuty);

        if (shouldShow) {
          visibleBuses.push({
            bus_number: bus.bus_number,
            reason: hasValidCoordinates ? 'has_valid_coordinates' : 
                   hasRecentLocation ? 'has_recent_location' : 
                   justWentOnDuty ? 'just_went_on_duty' : 'active_driver'
          });
        } else {
          hiddenBuses.push({
            bus_number: bus.bus_number,
            reasons: {
              noActiveDriver: !hasActiveDriver,
              noValidCoordinates: !hasValidCoordinates,
              noRecentLocation: !hasRecentLocation,
              notJustWentOnDuty: !justWentOnDuty
            }
          });
        }
      });

      this.log(`\n✅ Buses that SHOULD appear on map (${visibleBuses.length}):`, 'info');
      visibleBuses.forEach(bus => {
        this.log(`   - ${bus.bus_number} (${bus.reason})`, 'info');
      });

      if (hiddenBuses.length > 0) {
        this.log(`\n❌ Buses that WON'T appear on map (${hiddenBuses.length}):`, 'error');
        hiddenBuses.forEach(bus => {
          this.log(`   - ${bus.bus_number}`, 'error');
          this.log(`     Reasons:`, 'error');
          if (bus.reasons.noActiveDriver) this.log(`       • No active driver or status not 'active'`, 'error');
          if (!bus.reasons.noActiveDriver) {
            if (bus.reasons.noValidCoordinates) this.log(`       • No valid coordinates`, 'error');
            if (bus.reasons.noRecentLocation) this.log(`       • No recent location update (last 10 min)`, 'error');
            if (bus.reasons.notJustWentOnDuty) this.log(`       • Not just went on duty (updated > 2 min ago)`, 'error');
          }
        });
      }

      return { success: true, visibleBuses, hiddenBuses };
    } catch (error) {
      this.log(`❌ Map display logic test failed: ${error.message}`, 'error');
      return false;
    }
  },

  generateReport() {
    this.log('\n' + '='.repeat(60), 'info');
    this.log('=== DIAGNOSTIC TEST REPORT ===', 'info');
    this.log('='.repeat(60), 'info');
    this.log(`Total Tests: ${this.results.length}`, 'info');
    this.log(`Errors: ${this.errors.length}`, this.errors.length > 0 ? 'error' : 'info');
    this.log(`Warnings: ${this.warnings.length}`, this.warnings.length > 0 ? 'warning' : 'info');

    if (this.errors.length > 0) {
      this.log('\n=== ERRORS FOUND ===', 'error');
      this.errors.forEach((err, idx) => {
        this.log(`${idx + 1}. ${err.message}`, 'error');
      });
    }

    if (this.warnings.length > 0) {
      this.log('\n=== WARNINGS ===', 'warning');
      this.warnings.forEach((warn, idx) => {
        this.log(`${idx + 1}. ${warn.message}`, 'warning');
      });
    }

    this.log('\n=== RECOMMENDATIONS ===', 'info');
    
    if (this.errors.some(e => e.message.includes('Database connection'))) {
      this.log('1. Fix database connection - check Supabase credentials', 'info');
    }
    
    if (this.errors.some(e => e.message.includes('RPC function'))) {
      this.log('2. Create or fix the update_bus_location_simple RPC function in Supabase', 'info');
    }
    
    if (this.errors.some(e => e.message.includes('Location permission'))) {
      this.log('3. Grant location permissions to the app', 'info');
    }
    
    if (this.warnings.some(w => w.message.includes('Status') && w.message.includes('active'))) {
      this.log('4. Update bus status to "active" in the database', 'info');
      this.log('   SQL: UPDATE buses SET status = \'active\' WHERE driver_id IS NOT NULL;', 'info');
    }
    
    if (this.warnings.some(w => w.message.includes('NULL'))) {
      this.log('5. Check why coordinates are NULL - GPS may not be working', 'info');
      this.log('   - Verify location permissions', 'info');
      this.log('   - Check GPS signal strength', 'info');
      this.log('   - Verify location tracking is starting when driver goes on duty', 'info');
    }

    this.log('\n=== END OF REPORT ===', 'info');
  },

  async runAll() {
    this.log('Starting comprehensive bus tracking diagnostic test...', 'info');
    this.log('Time: ' + new Date().toISOString(), 'info');

    // Test 1: Database Connection
    const dbResult = await this.test1_DatabaseConnection();
    if (!dbResult || !dbResult.success) {
      this.log('❌ Cannot proceed without database connection', 'error');
      this.generateReport();
      return;
    }

    const supabase = dbResult.supabase;

    // Test 2: Bus Status and Coordinates
    const busResult = await this.test2_BusStatusAndCoordinates(supabase);
    
    // Test 3: RPC Function
    await this.test3_RPCFunctionExists(supabase);

    // Test 4: Driver Session
    const sessionResult = await this.test4_DriverSessionCheck();
    
    // Test 5: Location Permissions
    await this.test5_LocationPermissions();

    // Test 6: Location API
    const locationResult = await this.test6_LocationAPI();

    // Test 7: Update Flow (if we have a bus and location)
    if (busResult && busResult.buses && busResult.buses.length > 0 && locationResult && locationResult.success) {
      const testBus = busResult.buses[0];
      await this.test7_UpdateBusLocationFlow(supabase, testBus.id, locationResult.location.coords);
    }

    // Test 8: Map Display Logic
    await this.test8_MapDisplayLogic(supabase);

    // Generate final report
    this.generateReport();

    return {
      success: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      results: this.results
    };
  }
};

// Export for use in React Native
if (typeof module !== 'undefined' && module.exports) {
  module.exports = diagnosticTest;
}

// For browser/console testing
if (typeof window !== 'undefined') {
  window.busTrackingDiagnostic = diagnosticTest;
}

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     BUS TRACKING DIAGNOSTIC TEST - READY TO RUN              ║
╚══════════════════════════════════════════════════════════════╝

To run the diagnostic test, call:
  diagnosticTest.runAll()

Or in React Native console:
  require('./diagnostic-bus-tracking-test.js').runAll()
`);


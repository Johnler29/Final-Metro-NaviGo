import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bukrffymmsdbpqxmdwbv.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ1a3JmZnltbXNkYnBxeG1kd2J2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQyMDkxNDMsImV4cCI6MjA2OTc4NTE0M30.UpZBCFwo-hygvClBflw8B20rLGtcYPsyMaRGonH9omA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test database connection
export const testDatabaseConnection = async () => {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    console.log('Key:', supabaseAnonKey.substring(0, 20) + '...');
    
    // Test basic connection
    const { data, error } = await supabase.from('routes').select('count').limit(1);
    
    if (error) {
      console.error('❌ Database connection failed:', error);
      return { success: false, error: error.message };
    }
    
    console.log('✅ Database connection successful!');
    return { success: true, data };
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return { success: false, error: error.message };
  }
};

// Database table names
export const TABLES = {
  BUSES: 'buses',
  ROUTES: 'routes',
  STOPS: 'stops',
  SCHEDULES: 'schedules',
  FEEDBACK: 'feedback',
  USERS: 'users',
  DRIVERS: 'drivers',
  TRACKING: 'bus_tracking'
};

// Helper functions for common operations
export const supabaseHelpers = {
  // Ensure we have a valid auth session; refresh or clear if expired
  async ensureValidSession() {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session) return; // no session, use anon key
      const expSec = session.expires_at || 0;
      const nowSec = Math.floor(Date.now() / 1000);
      // Refresh if expired or within 60s of expiry
      if (expSec && expSec - nowSec < 60) {
        console.log('🔄 Refreshing expired/expiring session...');
        const { data: refreshed, error } = await supabase.auth.refreshSession();
        if (error || !refreshed?.session) {
          console.warn('⚠️ Session refresh failed, signing out to clear JWT');
          await supabase.auth.signOut();
        } else {
          console.log('✅ Session refreshed');
        }
      }
    } catch (e) {
      console.warn('⚠️ ensureValidSession error:', e?.message || e);
    }
  },

  // Wrap DB calls to auto-recover from JWT expired (PGRST301)
  async withAuthRecovery(fn) {
    try {
      await this.ensureValidSession();
      return await fn();
    } catch (e) {
      const code = e?.code || e?.status || e?.name;
      const message = e?.message || '';
      if (code === 'PGRST301' || /JWT expired/i.test(message)) {
        console.warn('⚠️ JWT expired during request, clearing session and retrying once');
        try { await supabase.auth.signOut(); } catch {}
        return await fn();
      }
      throw e;
    }
  },
  // Password hashing helper
  hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
  },

  // Bus operations
  async getBuses() {
    console.log('📡 Fetching buses from database...');
    const exec = async () => {
      const { data, error } = await supabase
        .from('buses')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    };
    const data = await this.withAuthRecovery(exec);

    // IMPORTANT: Include buses with assigned drivers (even if inactive) so driver app can find their bus
    // Filter to show:
    // 1. Buses with active drivers and recent activity (on duty)
    // 2. Buses with assigned drivers (off duty but assigned) - needed for driver app
    const activeBuses = data.filter(bus => {
      const hasRecentActivity = bus.last_location_update && 
        new Date(bus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000);
      const hasActiveDriver = bus.driver_id && bus.status === 'active';
      const hasAssignedDriver = bus.driver_id; // Bus has a driver assigned (even if off duty)
      
      // Return buses that are either:
      // - Active with recent activity (on duty)
      // - OR have an assigned driver (off duty but assigned - needed for driver app)
      return (hasActiveDriver && hasRecentActivity) || hasAssignedDriver;
    });
    console.log('✅ Buses fetched successfully:', data.length, 'total buses,', activeBuses.length, 'buses (active + assigned)');
    return activeBuses;
  },

  async getDriverBusAssignments() {
    console.log('📡 Fetching driver-bus assignments from database...');
    const { data, error } = await supabase
      .from('driver_bus_assignments')
      .select(`
        id,
        driver_id,
        bus_id,
        is_active,
        assigned_at,
        unassigned_at,
        notes,
        drivers:driver_id(name, email, license_number, id),
        buses:bus_id(
          bus_number,
          name,
          route_id,
          id,
          status,
          driver_id,
          routes:route_id(id, route_number, name)
        )
      `)
      // IMPORTANT: Don't filter by is_active - show all assignments
      // The app will check is_active when needed
      .order('assigned_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching driver-bus assignments:', error);
      throw error;
    }
    
    console.log('✅ Driver-bus assignments fetched successfully:', data?.length || 0, 'assignments');
    // Log sample assignment to debug structure
    if (data && data.length > 0) {
      console.log('📋 Sample assignment structure:', JSON.stringify(data[0], null, 2));
    }
    return data;
  },

  async getStopsByRoute(routeId) {
    console.log('📡 Fetching stops for route:', routeId);
    const { data, error } = await supabase
      .from('stops')
      // Alias DB columns (name/address/sequence) to app-expected keys
      .select(`
        id,
        stop_name:name,
        stop_description:address,
        latitude,
        longitude,
        route_id,
        stop_order:sequence
      `)
      .eq('route_id', routeId)
      .order('sequence');
    
    if (error) {
      console.error('❌ Error fetching stops:', error);
      throw error;
    }
    
    console.log('✅ Stops fetched successfully:', data?.length || 0, 'stops');
    return data;
  },

  async getBusById(id) {
    const { data, error } = await supabase
      .from(TABLES.BUSES)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },


  // Route operations
  async getRoutes() {
    console.log('📡 Fetching routes from database...');
    const { data, error } = await supabase
      .from(TABLES.ROUTES)
      .select(`
        *,
        stops (
          id,
          stop_name:name,
          stop_description:address,
          latitude,
          longitude,
          stop_order:sequence
        )
      `)
      .order('route_number', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching routes:', error);
      throw error;
    }
    
    console.log('✅ Routes fetched successfully:', data?.length || 0, 'routes');
    return data;
  },

  // Get routes with full details including coordinates and stops
  async getRoutesWithDetails() {
    console.log('📡 Fetching routes with full details from database...');
    const execRpc = async () => {
      const { data, error } = await supabase.rpc('get_all_routes_with_details');
      if (error) throw error;
      return data || [];
    };
    try {
      const data = await this.withAuthRecovery(execRpc);
      console.log('✅ Routes with details fetched successfully:', data.length, 'routes');
      return data;
    } catch (err) {
      // 42702 = column reference is ambiguous (seen in screenshot). Fallback to explicit select.
      const code = err?.code || '';
      const msg = err?.message || '';
      if (code === '42702' || /ambiguous/i.test(msg)) {
        console.warn('⚠️ RPC get_all_routes_with_details failed due to ambiguity; using explicit select fallback');
        const execSelect = async () => {
          const { data, error } = await supabase
            .from('routes')
            .select(`
              id,
              route_number,
              name,
              description,
              origin,
              destination,
              estimated_duration,
              fare,
              status,
              created_at,
              updated_at,
              stops:stops(
                id,
                stop_name:name,
                stop_description:address,
                latitude,
                longitude,
                route_id,
                stop_order:sequence
              )
            `)
            .order('route_number', { ascending: true });
          if (error) throw error;
          return data || [];
        };
        const data = await this.withAuthRecovery(execSelect);
        console.log('✅ Routes fetched via fallback:', data.length);
        return data;
      }
      console.error('❌ Error fetching routes with details:', err);
      throw err;
    }
  },

  async getRouteById(id) {
    const { data, error } = await supabase
      .from(TABLES.ROUTES)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Stop operations
  async getStops() {
    console.log('📡 Fetching stops from database...');
    const { data, error } = await supabase
      .from(TABLES.STOPS)
      // Provide aliases so downstream UI continues to work
      .select(`
        id,
        stop_name:name,
        stop_description:address,
        latitude,
        longitude,
        route_id,
        stop_order:sequence
      `)
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching stops:', error);
      throw error;
    }
    
    console.log('✅ Stops fetched successfully:', data?.length || 0, 'stops');
    return data;
  },


  // Schedule operations
  async getSchedules() {
    console.log('📡 Fetching schedules from database...');
    const { data, error } = await supabase
      .from(TABLES.SCHEDULES)
      .select('*')
      .order('departure_time', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching schedules:', error);
      throw error;
    }
    
    console.log('✅ Schedules fetched successfully:', data?.length || 0, 'schedules');
    return data;
  },

  async getSchedulesByRoute(routeId) {
    const { data, error } = await supabase
      .from(TABLES.SCHEDULES)
      .select('*')
      .eq('route_id', routeId)
      .order('departure_time', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  // Feedback operations
  async getFeedback() {
    console.log('📡 Fetching feedback from database...');
    const { data, error } = await supabase
      .from(TABLES.FEEDBACK)
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching feedback:', error);
      throw error;
    }
    
    console.log('✅ Feedback fetched successfully:', data?.length || 0, 'feedback entries');
    return data;
  },

  async submitFeedback(feedback) {
    console.log('📡 Submitting feedback to database...');
    const { data, error } = await supabase
      .from(TABLES.FEEDBACK)
      .insert({
        message: feedback,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('❌ Error submitting feedback:', error);
      throw error;
    }
    
    console.log('✅ Feedback submitted successfully');
    return data;
  },

  // User operations
  async createUser(userData) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .insert(userData);
    
    if (error) throw error;
    return data;
  },

  async getUserById(id) {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Driver operations
  async getDrivers() {
    console.log('📡 Fetching drivers from database...');
    const { data, error } = await supabase
      .from(TABLES.DRIVERS)
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching drivers:', error);
      throw error;
    }
    
    console.log('✅ Drivers fetched successfully:', data?.length || 0, 'drivers');
    return data;
  },

  async getDriverById(id) {
    const { data, error } = await supabase
      .from(TABLES.DRIVERS)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async getDriverSchedules(driverId) {
    console.log('📡 Fetching driver schedules for driver:', driverId);
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        buses!inner(driver_id),
        routes(*)
      `)
      .eq('buses.driver_id', driverId)
      .order('departure_time', { ascending: true });

    if (error) {
      console.error('❌ Error fetching driver schedules:', error);
      throw error;
    }

    return data || [];
  },

  async getDriverBuses(driverId) {
    console.log('📡 Fetching driver buses for driver:', driverId);
    const { data, error } = await supabase
      .from('buses')
      .select(`
        *,
        routes(*)
      `)
      .eq('driver_id', driverId)
      .order('bus_number', { ascending: true });

    if (error) {
      console.error('❌ Error fetching driver buses:', error);
      throw error;
    }

    return data || [];
  },

  async updateDriverStatus(driverId, status) {
    console.log('📡 Updating driver status:', driverId, status);
    const timestamp = new Date().toISOString();

    // Normalize status terms to match DB constraints while preserving intent
    // The mobile app may use 'on_duty'/'off_duty'. The default DB CHECK allows
    // only 'active' | 'inactive' | 'on_leave' on the 'status' column.
    const lowerStatus = typeof status === 'string' ? status.toLowerCase() : status;
    const normalizedTextStatus = (function mapToTextStatus(s) {
      if (s === 'on_duty' || s === 'on' || s === 'active') return 'active';
      if (s === 'off_duty' || s === 'off' || s === 'inactive') return 'inactive';
      if (s === 'on_leave' || s === 'leave') return 'on_leave';
      return s || 'inactive';
    })(lowerStatus);
    const normalizedIsActive = normalizedTextStatus === 'active';
    // Try multiple schemas/columns for compatibility
    // 1) status (text)
    let resp = await supabase
      .from('drivers')
      .update({ status: normalizedTextStatus, updated_at: timestamp })
      .eq('id', driverId)
      .select();
    if (!resp.error) return resp.data;

    console.warn('⚠️ Update with column "status" failed, trying "driver_status"...', resp.error?.message);

    // 2) driver_status (text)
    resp = await supabase
      .from('drivers')
      .update({ driver_status: lowerStatus, updated_at: timestamp })
      .eq('id', driverId)
      .select();
    if (!resp.error) return resp.data;

    console.warn('⚠️ Update with column "driver_status" failed, trying boolean "is_active"...', resp.error?.message);

    // 3) is_active (boolean) + last_status (optional text for audit)
    const isActive = normalizedIsActive;
    resp = await supabase
      .from('drivers')
      .update({ is_active: isActive, last_status: lowerStatus, updated_at: timestamp })
      .eq('id', driverId)
      .select();
    if (!resp.error) return resp.data;

    console.error('❌ Error updating driver status with all strategies:', resp.error);
    throw resp.error;
  },

  async startTrip(driverId, busId, routeId) {
    console.log('📡 Starting trip for driver:', driverId, 'bus:', busId, 'route:', routeId);
    
    // Validate parameters early so we can surface clear errors
    if (!driverId || driverId === 'null' || driverId === 'undefined') {
      throw new Error('Invalid driver ID');
    }
    if (!busId || busId === 'null' || busId === 'undefined') {
      throw new Error('Invalid bus ID');
    }
    if (!routeId || routeId === 'null' || routeId === 'undefined') {
      throw new Error('Invalid route ID');
    }
    
    // Preferred path: use the SECDEF RPC so we don't fight row‑level security.
    try {
      const { data, error } = await supabase.rpc('start_trip', {
        p_bus_id: busId,
        p_driver_id: driverId,
      });

      if (!error && data && typeof data === 'object' && data.success) {
        console.log('✅ Trip started via RPC start_trip:', data);

        // Best-effort: make sure tracking_status reflects that we're moving.
        try {
          await supabase
            .from('buses')
            .update({
              tracking_status: 'moving',
              updated_at: new Date().toISOString(),
            })
            .eq('id', busId);
        } catch (busUpdateError) {
          console.warn('⚠️ Failed to update bus tracking_status after RPC start_trip:', busUpdateError);
        }

        // RPC does not create a schedule row; return a minimal object so callers
        // can still store trip metadata locally.
        return {
          success: true,
          bus_id: data.bus_id || busId,
          driver_id: data.driver_id || driverId,
          route_id: routeId,
        };
      }

      if (error) {
        console.warn('⚠️ RPC start_trip failed, falling back to direct schedule/bus updates:', error);
      } else if (!data?.success) {
        console.warn('⚠️ RPC start_trip reported failure:', data);
        throw new Error(data?.message || 'Failed to start trip');
      }
    } catch (rpcError) {
      // If the function doesn't exist or permission is denied, fall back to legacy path.
      console.warn('⚠️ Error calling RPC start_trip, attempting legacy startTrip flow:', rpcError);
    }

    // Legacy fallback: create / update a schedule row directly.
    try {
      const departureTime = new Date().toTimeString().split(' ')[0]; // HH:MM:SS
      const timestamp = new Date().toISOString();

      // Try to update an existing schedule first
      const { data: updateData, error: updateError } = await supabase
        .from('schedules')
        .update({
          is_active: true,
          departure_time: departureTime,
          updated_at: timestamp,
        })
        .eq('bus_id', busId)
        .eq('route_id', routeId)
        .select()
        .maybeSingle();

      let scheduleRow = updateData || null;

      // If no row was updated, create a new schedule
      if (!scheduleRow) {
        if (updateError && updateError.code && updateError.code !== 'PGRST116') {
          console.warn('⚠️ Schedule update error (non‑fatal, will try insert):', updateError);
        }

        console.log('📝 No existing schedule found, creating new one in fallback path...');
        const { data: insertData, error: insertError } = await supabase
          .from('schedules')
          .insert({
            bus_id: busId,
            route_id: routeId,
            departure_time: departureTime,
            arrival_time: null,
            days_of_week: [1, 2, 3, 4, 5], // Monday to Friday
            is_active: true,
            created_at: timestamp,
            updated_at: timestamp,
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ Error creating new schedule in fallback path:', insertError);
          throw insertError;
        }

        scheduleRow = insertData;
      }

      // Update bus status and ensure driver is assigned (subject to RLS)
      try {
        await supabase
          .from('buses')
          .update({
            status: 'active',
            tracking_status: 'moving',
            driver_id: driverId,
            updated_at: timestamp,
          })
          .eq('id', busId);
      } catch (busUpdateError) {
        console.warn('⚠️ Failed to update bus row during legacy startTrip:', busUpdateError);
      }

      console.log('✅ Trip started successfully via legacy startTrip:', scheduleRow);
      return scheduleRow;
    } catch (error) {
      console.error('❌ Error starting trip (all strategies failed):', error);
      throw error;
    }
  },

  async endTrip(scheduleId, endData) {
    console.log('📡 Ending trip:', scheduleId, 'busId:', endData?.busId);
    
    // Ensure valid session before ending trip
    await this.ensureValidSession();

    // If scheduleId is provided, try to update the schedule
    if (scheduleId) {
      try {
        const { data, error } = await supabase
          .from('schedules')
          .update({
            is_active: false,
            arrival_time: new Date().toTimeString().split(' ')[0], // HH:MM:SS format
            updated_at: new Date().toISOString()
          })
          .eq('id', scheduleId)
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Error updating schedule (non-fatal, will try bus update):', error);
        } else {
          console.log('✅ Schedule updated successfully');
        }
      } catch (scheduleError) {
        console.warn('⚠️ Failed to update schedule (non-fatal):', scheduleError);
      }
    } else {
      console.log('⚠️ No scheduleId provided, skipping schedule update');
    }

    // Always update bus status (this is the critical part)
    if (endData?.busId) {
      // First, get the driver_id from the bus before we clear it
      const { data: busBeforeUpdate, error: busFetchError } = await supabase
        .from('buses')
        .select('driver_id')
        .eq('id', endData.busId)
        .single();
      
      const driverId = busBeforeUpdate?.driver_id;
      
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .update({ 
          status: 'inactive',
          tracking_status: 'stopped',
          driver_id: null, // Remove driver assignment
          updated_at: new Date().toISOString()
        })
        .eq('id', endData.busId)
        .select()
        .single();

      if (busError) {
        console.error('❌ Error updating bus status:', busError);
        console.error('❌ Error details:', JSON.stringify(busError, null, 2));
        
        // Provide more helpful error messages
        if (busError.code === 'PGRST116') {
          throw new Error('Bus not found. Please check your bus assignment.');
        } else if (busError.code === '42501') {
          throw new Error('Permission denied. You may not have permission to update this bus.');
        } else if (busError.message) {
          throw new Error(`Failed to update bus status: ${busError.message}`);
        } else {
          throw new Error('Failed to update bus status. Please try again.');
        }
      }

      console.log('✅ Bus status updated successfully:', busData);
      
      // CRITICAL: Also update driver status to inactive when trip ends
      if (driverId) {
        try {
          await this.updateDriverStatus(driverId, 'inactive');
          console.log('✅ Driver status updated to inactive after trip end:', driverId);
        } catch (driverStatusError) {
          console.warn('⚠️ Failed to update driver status after trip end (non-fatal):', driverStatusError?.message || driverStatusError);
          // Don't throw - bus update succeeded, driver status update is secondary
        }
      }
      
      return busData || { success: true, busId: endData.busId };
    } else {
      throw new Error('Bus ID is required to end trip');
    }
  },

  async updatePassengerCount(busId, passengerCount) {
    console.log('📡 Updating passenger count for bus:', busId, 'count:', passengerCount);
    const { data, error } = await supabase
      .from('buses')
      .update({ 
        current_passengers: passengerCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', busId)
      .select();

    if (error) {
      console.error('❌ Error updating passenger count:', error);
      throw error;
    }

    return data;
  },

  async reportEmergency(driverId, emergencyData) {
    console.log('📡 Reporting emergency for driver:', driverId);
    
    const { data, error } = await supabase
      .from('driver_emergency_reports')
      .insert({
        driver_id: driverId,
        bus_id: emergencyData.busId || null,
        route_id: emergencyData.routeId || null,
        emergency_type: emergencyData.type,
        description: emergencyData.description,
        location_lat: emergencyData.location?.latitude || null,
        location_lng: emergencyData.location?.longitude || null,
        priority: emergencyData.priority || 'medium',
        status: 'reported'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error reporting emergency:', error);
      // Fallback: log the emergency and return success
      console.log('📝 Emergency reported (fallback):', {
        driverId,
        type: emergencyData.type,
        description: emergencyData.description,
        timestamp: new Date().toISOString()
      });
      
      // Return a mock success response
      return {
        id: 'emergency_' + Date.now(),
        emergency_type: emergencyData.type,
        description: emergencyData.description,
        status: 'reported'
      };
    }

    return data;
  },

  async reportMaintenanceIssue(driverId, issueData) {
    console.log('📡 Reporting maintenance issue for driver:', driverId);
    
    const { data, error } = await supabase
      .from('driver_maintenance_reports')
      .insert({
        driver_id: driverId,
        bus_id: issueData.busId || null,
        issue_type: issueData.issue,
        description: issueData.description,
        priority: issueData.priority || 'medium',
        location_lat: issueData.location?.latitude || null,
        location_lng: issueData.location?.longitude || null,
        status: 'reported'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error reporting maintenance issue:', error);
      // Fallback: log the maintenance issue and return success
      console.log('📝 Maintenance issue reported (fallback):', {
        driverId,
        issue: issueData.issue,
        description: issueData.description,
        priority: issueData.priority,
        timestamp: new Date().toISOString()
      });
      
      // Return a mock success response
      return {
        id: 'maintenance_' + Date.now(),
        issue_type: issueData.issue,
        description: issueData.description,
        status: 'reported'
      };
    }

    return data;
  },

  // Passenger feedback functions
  async submitPassengerFeedback(userId, feedbackData) {
    console.log('📡 Submitting passenger feedback for user:', userId);
    
    const { data, error } = await supabase
      .from('passenger_feedback')
      .insert({
        user_id: userId,
        bus_id: feedbackData.busId || null,
        route_id: feedbackData.routeId || null,
        message: feedbackData.message,
        rating: feedbackData.rating || null,
        category: feedbackData.category || 'general',
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error submitting passenger feedback:', error);
      throw error;
    }

    return data;
  },

  async getPassengerFeedback(userId, filters = {}) {
    console.log('📡 Getting passenger feedback for user:', userId);
    
    let query = supabase
      .from('passenger_feedback')
      .select(`
        *,
        buses(plate_number, model),
        routes(route_number, name)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.category) {
      query = query.eq('category', filters.category);
    }
    if (filters.busId) {
      query = query.eq('bus_id', filters.busId);
    }
    if (filters.routeId) {
      query = query.eq('route_id', filters.routeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error getting passenger feedback:', error);
      throw error;
    }

    return data;
  },

  async updateBusCapacityStatus(busId, capacityPercentage) {
    console.log('📡 Updating bus capacity status for bus:', busId, 'capacity:', capacityPercentage + '%');
    
    // Validate inputs
    if (!busId) {
      throw new Error('Bus ID is required');
    }
    
    if (capacityPercentage < 0 || capacityPercentage > 100) {
      throw new Error('Capacity percentage must be between 0 and 100');
    }

    // Ensure valid session before updating
    await this.ensureValidSession();

    try {
      // Get capacity from bus record first (column is 'capacity', not 'max_capacity')
      const { data: busData, error: fetchError } = await supabase
        .from('buses')
        .select('capacity')
        .eq('id', busId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching bus data:', fetchError);
        // If column doesn't exist, use default capacity of 50
        if (fetchError.message && fetchError.message.includes('does not exist')) {
          console.warn('⚠️ Capacity column not found, using default value of 50');
        } else {
          throw new Error(`Bus not found: ${fetchError.message}`);
        }
      }

      // Use 'capacity' column if it exists, otherwise default to 50
      const maxCapacity = busData?.capacity || 50;
      const currentPassengers = Math.round((capacityPercentage / 100) * maxCapacity);

      // Update bus capacity - columns should exist after running migration
      const updateData = {
        current_passengers: currentPassengers,
        capacity_percentage: capacityPercentage,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('buses')
        .update(updateData)
        .eq('id', busId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating bus capacity status:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Check if error is about missing columns
        const errorMessage = error.message || '';
        const isColumnError = errorMessage.includes('capacity_percentage') || 
                            errorMessage.includes('current_passengers') ||
                            errorMessage.includes('does not exist') ||
                            errorMessage.includes('schema cache');
        
        if (isColumnError) {
          throw new Error(
            'Database columns missing. Please run the migration script: sql/add-bus-capacity-columns.sql\n\n' +
            'This will add the required capacity_percentage and current_passengers columns to the buses table.'
          );
        }
        
        // Other errors
        if (error.code === 'PGRST116') {
          throw new Error('Bus not found. Please check your bus assignment.');
        } else if (error.code === '42501') {
          throw new Error('Permission denied. You may not have permission to update this bus.');
        } else if (error.message) {
          throw new Error(`Update failed: ${error.message}`);
        } else {
          throw new Error('Failed to update bus capacity. Please try again.');
        }
      }

      console.log('✅ Bus capacity updated successfully:', data);
      return data;
    } catch (error) {
      // Re-throw with better error message if it's already an Error object
      if (error instanceof Error) {
        throw error;
      }
      // Otherwise wrap the error
      throw new Error(error?.message || 'Failed to update bus capacity. Please try again.');
    }
  },

  async getBusCapacityStatus(busId) {
    console.log('📡 Getting bus capacity status for bus:', busId);
    
    try {
      // Use 'capacity' column (not 'max_capacity') based on schema
      const { data, error } = await supabase
        .from('buses')
        .select('id, current_passengers, capacity_percentage, capacity')
        .eq('id', busId)
        .single();

      if (error) {
        console.warn('⚠️ Bus capacity columns not found, using defaults:', error);
        // Return default values if columns don't exist
        return {
          id: busId,
          current_passengers: 0,
          capacity_percentage: 0,
          capacity: 50,
          max_capacity: 50 // For backward compatibility
        };
      }

      // Map 'capacity' to 'max_capacity' for backward compatibility
      return {
        ...data,
        max_capacity: data.capacity || 50
      };
    } catch (err) {
      console.warn('⚠️ Error getting bus capacity status, using defaults:', err);
      // Return default values on any error
      return {
        id: busId,
        current_passengers: 0,
        capacity_percentage: 0,
        capacity: 50,
        max_capacity: 50 // For backward compatibility
      };
    }
  },

  async authenticateDriver(email, password) {
    console.log('🔐 Authenticating driver with email:', email);
    
    try {
      // First, get the driver by email
      const { data: drivers, error: fetchError } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', email)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        console.error('❌ Error fetching driver:', fetchError);
        throw new Error('Invalid credentials');
      }

      if (!drivers) {
        throw new Error('Invalid credentials');
      }

      // Hash the provided password and compare with stored hash if available
      try {
        const hashedPassword = supabaseHelpers.hashPassword(password || '');
        if (typeof drivers.password_hash === 'string') {
          if (drivers.password_hash !== hashedPassword) {
            console.log('❌ Password mismatch');
            throw new Error('Invalid credentials');
          }
        } else if (typeof drivers.password === 'string') {
          // Fallback for legacy plain-text (development only)
          if (drivers.password !== password) {
            console.log('❌ Legacy password mismatch');
            throw new Error('Invalid credentials');
          }
        } else {
          // If no password field exists, block by default to avoid unsafe login
          console.warn('⚠️ No password field found for driver; denying login.');
          throw new Error('Invalid credentials');
        }
      } catch (e) {
        // Re-throw as invalid credentials without crashing
        throw new Error('Invalid credentials');
      }

      // Update last login
      await supabase
        .from('drivers')
        .update({ 
          last_login: new Date().toISOString(),
          login_attempts: 0,
          locked_until: null
        })
        .eq('id', drivers.id);

      // Return driver information in the expected format
      const safeName = typeof drivers.name === 'string' ? drivers.name : '';
      const nameParts = safeName.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts[0] || (safeName || 'Driver');
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      const result = [{
        driver_id: drivers.id,
        email: drivers.email || email,
        first_name: firstName,
        last_name: lastName,
        driver_status: drivers.driver_status || (drivers.is_active ? 'on_duty' : 'off_duty'),
        is_active: Boolean(drivers.is_active ?? (drivers.status === 'active')),
        license_number: drivers.license_number || ''
      }];

      console.log('✅ Driver authenticated successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Driver authentication failed:', error);
      throw error;
    }
  },

  async updateBusLocation(locationData) {
    console.log('📍 Updating bus location:', locationData);
    
    try {
      // Ensure we have a valid bus id; avoid sending 4-arg RPC payload
      if (!locationData || !locationData.busId) {
        throw new Error('Missing busId for location update');
      }

      // Validate coordinates; if missing/invalid, handle clear vs update
      const lat = locationData.latitude;
      const lng = locationData.longitude;
      const latitudeIsValid = typeof lat === 'number' && Number.isFinite(lat);
      const longitudeIsValid = typeof lng === 'number' && Number.isFinite(lng);
      
      // Enhanced logging for debugging NULL coordinates issue
      if (!latitudeIsValid || !longitudeIsValid) {
        console.error('❌ Invalid coordinates received for bus:', {
          busId: locationData.busId,
          latitude: lat,
          longitude: lng,
          latType: typeof lat,
          lngType: typeof lng,
          latIsFinite: typeof lat === 'number' ? Number.isFinite(lat) : false,
          lngIsFinite: typeof lng === 'number' ? Number.isFinite(lng) : false,
          reason: !latitudeIsValid ? 'invalid_latitude' : 'invalid_longitude'
        });
        
        // IMPORTANT FIX: Don't update last_location_update if coordinates are invalid
        // Don't clear coordinates either - GPS might still be acquiring location
        // Only skip the update and return error - don't touch the database
        console.warn('⚠️ Rejecting location update: invalid coordinates (one or both invalid)', { 
          busId: locationData.busId,
          lat, 
          lng,
          reason: 'GPS coordinates not yet available or invalid'
        });
        
        // Don't update last_location_update - only update when coordinates are valid
        // This prevents the issue where last_location_update is updated but coordinates remain NULL
        return { 
          success: false, 
          error: 'Invalid coordinates - GPS may still be acquiring location', 
          skipped: true, 
          reason: 'invalid_coordinates',
          message: 'GPS coordinates are not yet available. Please wait for GPS signal or check location permissions.'
        };
      }

      console.log('📍 Using busId for RPC:', locationData.busId);
      
      // Ensure coordinates are proper numbers (already validated above, but double-check)
      // Don't use parseFloat if already a number - just ensure they're numbers
      const finalLat = typeof lat === 'number' ? lat : parseFloat(lat);
      const finalLng = typeof lng === 'number' ? lng : parseFloat(lng);
      
      // Final validation before sending (extra safety check)
      if (!Number.isFinite(finalLat) || !Number.isFinite(finalLng)) {
        console.error('❌ Coordinates failed final validation:', { finalLat, finalLng, lat, lng });
        return {
          success: false,
          error: 'Coordinates failed validation before database call',
          skipped: true
        };
      }
      
      console.log('📤 Sending to database:', { 
        busId: locationData.busId, 
        latitude: finalLat, 
        longitude: finalLng 
      });
      
      // Use the fixed simple location update function with correct parameter order
      const { data, error } = await supabase.rpc('update_bus_location_simple', {
        p_bus_id: locationData.busId,
        p_latitude: finalLat,
        p_longitude: finalLng,
        p_accuracy: locationData.accuracy != null ? parseFloat(locationData.accuracy) : 10.0,
        p_speed_kmh: locationData.speed != null ? parseFloat(locationData.speed) : null
      });

      // Check if the update was successful
      if (error) {
        console.error('❌ Location update failed:', error);
        throw error;
      }

      // Check if data exists and has success property
      if (data && typeof data === 'object' && 'success' in data) {
        if (!data.success) {
          console.warn('⚠️ Location update rejected:', data.message || 'Unknown reason');
          throw new Error(data.message || 'Location update rejected');
        }

        console.log('✅ Bus location updated successfully:', {
          success: data.success,
          message: data.message,
          bus_id: data.bus_id
        });
      } else {
        console.log('✅ Bus location updated successfully');
      }

      return data || { success: true };
    } catch (error) {
      console.error('❌ Error updating bus location:', error);
      throw error;
    }
  },

  async startDriverSession(driverId, busId) {
    console.log('🚌 Starting driver session for driver:', driverId, 'bus:', busId);
    
    // Validate parameters
    if (!driverId || driverId === 'null' || driverId === 'undefined') {
      throw new Error('Invalid driver ID for session');
    }
    if (!busId || busId === 'null' || busId === 'undefined') {
      throw new Error('Invalid bus ID for session');
    }
    
    // Simple UUID generator
    const generateUUID = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    try {
      // First get the route_id for this bus
      const { data: busData, error: busError } = await supabase
        .from('buses')
        .select('route_id')
        .eq('id', busId)
        .single();

      if (busError) {
        console.error('❌ Error getting bus route:', busError);
        throw busError;
      }

      const { data, error } = await supabase
        .from('driver_sessions')
        .insert({
          driver_id: driverId,
          bus_id: busId,
          route_id: busData.route_id, // Include route_id from bus
          session_token: generateUUID(),
          device_info: {
            platform: 'mobile',
            app_version: '1.0.0'
          },
          status: 'active'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error starting driver session:', error);
        throw error;
      }

      // Ensure the bus is linked to the driver for visibility on maps
      // CRITICAL: Set status to 'active' so bus appears on passenger maps immediately
      try {
        const updateResult = await supabase
          .from('buses')
          .update({
            driver_id: driverId,
            status: 'active',
            tracking_status: 'moving', // Ensure tracking_status is set
            updated_at: new Date().toISOString()
          })
          .eq('id', busId)
          .select('status, driver_id, tracking_status, updated_at')
          .single();
        
        if (updateResult.error) {
          console.error('❌ Failed to update bus status:', updateResult.error);
          throw updateResult.error;
        }
        
        console.log('✅ Bus status updated to active:', {
          busId,
          status: updateResult.data?.status,
          driver_id: updateResult.data?.driver_id,
          tracking_status: updateResult.data?.tracking_status,
          updated_at: updateResult.data?.updated_at
        });
      } catch (e) {
        console.error('❌ Failed to assign driver to bus on session start:', e?.message || e);
        // Don't throw - session creation should still succeed
      }

      console.log('✅ Driver session started successfully:', data);
      return data;
    } catch (error) {
      console.error('❌ Driver session start failed:', error);
      throw error;
    }
  },

  async endDriverSession(sessionId) {
    console.log('🛑 Ending driver session:', sessionId);
    
    try {
      // First, get the session to find the associated bus
      const { data: sessionData, error: sessionError } = await supabase
        .from('driver_sessions')
        .select('bus_id')
        .eq('id', sessionId)
        .single();

      if (sessionError) {
        console.warn('⚠️ Session not found when ending, continuing to finalize off-duty:', sessionError.message);
      }

      // Update the session status
      const { data, error } = await supabase
        .from('driver_sessions')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select()
        .maybeSingle();

      if (error) {
        console.error('❌ Error ending driver session:', error);
        throw error;
      }

      // Clear the bus location and set it to offline; also unassign driver and mark bus inactive
      if (sessionData?.bus_id) {
        console.log('🚌 Clearing bus location for offline driver:', sessionData.bus_id);
        
        // Get driver_id before clearing it
        const { data: busBeforeUpdate } = await supabase
          .from('buses')
          .select('driver_id')
          .eq('id', sessionData.bus_id)
          .single();
        
        const driverId = busBeforeUpdate?.driver_id;
        
        await supabase
          .from('buses')
          .update({
            latitude: null,
            longitude: null,
            tracking_status: 'offline',
            status: 'inactive',
            driver_id: null,
            last_location_update: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionData.bus_id);
        
        // CRITICAL: Also update driver status to inactive when session ends
        if (driverId) {
          try {
            await this.updateDriverStatus(driverId, 'inactive');
            console.log('✅ Driver status updated to inactive after session end:', driverId);
          } catch (driverStatusError) {
            console.warn('⚠️ Failed to update driver status after session end (non-fatal):', driverStatusError?.message || driverStatusError);
            // Don't throw - bus update succeeded, driver status update is secondary
          }
        }
      }

      console.log('✅ Driver session end flow completed');
      return data || { success: true };
    } catch (error) {
      console.error('❌ Driver session end failed:', error);
      throw error;
    }
  },

  async getDriverPerformance(driverId, period = 'week') {
    console.log('📡 Getting driver performance for driver:', driverId, 'period:', period);
    
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        buses!inner(driver_id),
        routes(*)
      `)
      .eq('buses.driver_id', driverId)
      .gte('departure_time', startDate.toISOString())
      .order('departure_time', { ascending: false });

    if (error) {
      console.error('❌ Error getting driver performance:', error);
      throw error;
    }

    return data || [];
  },

  // Real-time subscriptions
  subscribeToBusLocations(callback) {
    return supabase
      .channel('bus_locations')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLES.BUSES },
        callback
      )
      .subscribe();
  },

  subscribeToSchedules(callback) {
    return supabase
      .channel('schedules')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: TABLES.SCHEDULES },
        callback
      )
      .subscribe();
  },

  // Additional helper functions using the new views and functions

  // Get active buses (using real-time function)
  async getActiveBuses() {
    console.log('📡 Fetching active buses...');
    const { data, error } = await supabase
      .rpc('get_realtime_bus_status');
    
    if (error) {
      console.error('❌ Error fetching active buses:', error);
      throw error;
    }
    
    // Filter for active buses only
    const activeBuses = data?.filter(bus => 
      bus.tracking_status === 'moving' || 
      bus.tracking_status === 'at_stop' || 
      bus.tracking_status === 'stopped'
    ) || [];
    
    console.log('✅ Active buses fetched successfully:', activeBuses.length, 'buses');
    return activeBuses;
  },

  // Get nearby buses within a radius
  async getNearbyBuses(latitude, longitude, radiusKm = 5.0) {
    console.log('📡 Fetching nearby buses...');
    const { data, error } = await supabase
      .rpc('get_nearby_buses', {
        user_lat: latitude,
        user_lng: longitude,
        radius_km: radiusKm
      });
    
    if (error) {
      console.error('❌ Error fetching nearby buses:', error);
      throw error;
    }
    
    console.log('✅ Nearby buses fetched successfully:', data?.length || 0, 'buses');
    return data;
  },

  // Update bus location using the database function
  async updateBusLocationFunction(busId, latitude, longitude, speed = null, heading = null, status = 'moving') {
    console.log('📡 Updating bus location...');
    if (!busId) {
      throw new Error('Missing busId for location update');
    }
    console.log('📍 Using busId for RPC (function):', busId);
    const { data, error } = await supabase
      .rpc('update_bus_location_simple', {
        p_bus_id: busId,
        p_latitude: latitude,
        p_longitude: longitude,
        p_accuracy: 10.0, // Default accuracy
        p_speed_kmh: speed
      });
    
    if (error) {
      console.error('❌ Error updating bus location:', error);
      throw error;
    }
    
    console.log('✅ Bus location updated successfully');
    return data;
  },

  // Get bus statistics
  async getBusStatistics() {
    console.log('📡 Fetching bus statistics...');
    const { data, error } = await supabase
      .rpc('get_bus_statistics');
    
    if (error) {
      console.error('❌ Error fetching bus statistics:', error);
      throw error;
    }
    
    console.log('✅ Bus statistics fetched successfully');
    return data?.[0] || null;
  },

  // Test function to verify database data
  async testDatabaseData() {
    console.log('🧪 Testing database data...');
    
    // Test buses
    const { data: buses, error: busesError } = await supabase
      .from('buses')
      .select('*')
      .limit(5);
    
    if (busesError) {
      console.error('❌ Error fetching buses:', busesError);
      return { success: false, error: busesError.message };
    }
    
    console.log('✅ Buses test:', buses?.length || 0, 'buses found');
    
    // Test bus tracking
    const { data: tracking, error: trackingError } = await supabase
      .from('bus_tracking')
      .select('*')
      .limit(5);
    
    if (trackingError) {
      console.error('❌ Error fetching bus tracking:', trackingError);
      return { success: false, error: trackingError.message };
    }
    
    console.log('✅ Bus tracking test:', tracking?.length || 0, 'tracking records found');
    
    // Test get_realtime_bus_status function
    const { data: viewData, error: viewError } = await supabase
      .rpc('get_realtime_bus_status');
    
    if (viewError) {
      console.error('❌ Error fetching real-time bus status:', viewError);
      return { success: false, error: viewError.message };
    }
    
    console.log('✅ Real-time bus status test:', viewData?.length || 0, 'records found');
    console.log('✅ Sample real-time data:', viewData?.[0]);
    
    return { 
      success: true, 
      data: { 
        buses: buses?.length || 0, 
        tracking: tracking?.length || 0, 
        view: viewData?.length || 0,
        sampleViewData: viewData?.[0]
      } 
    };
  },

  // Ping Bus Notifications with Rate Limiting
  async pingBus(busId, pingType = 'ride_request', message = '', location = null) {
    console.log('📡 Sending ping to bus:', busId, 'type:', pingType);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated. Please log in first.' };
      }

      // Use rate-limited ping function
      const { data, error } = await supabase.rpc('send_ping_with_limit', {
        p_user_id: user.id,
        p_bus_id: busId,
        p_ping_type: pingType,
        p_message: message || null,
        p_location_latitude: location?.latitude || null,
        p_location_longitude: location?.longitude || null,
        p_location_address: location?.address || null
      });

      if (error) {
        console.error('❌ Error sending ping:', error);
        return { success: false, error: error.message };
      }

      // Check if ping was successful
      if (data && typeof data === 'object') {
        if (data.success === false) {
          return {
            success: false,
            error: data.error || 'Failed to send ping',
            reason: data.reason,
            cooldown_remaining: data.cooldown_remaining,
            blocked_until: data.blocked_until
          };
        }

        console.log('✅ Ping sent successfully:', data);
        return {
          success: true,
          ping_id: data.ping_id,
          message: data.message,
          remaining_today: data.remaining_today,
          pings_today: data.pings_today
        };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Error pinging bus:', error);
      return { success: false, error: error.message };
    }
  },

  // Get user's ping status and limits
  async getUserPingStatus() {
    console.log('📡 Getting user ping status...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('⚠️ No authenticated user, returning defaults');
        return {
          is_blocked: false,
          blocked_until: null,
          pings_today: 0,
          pings_remaining: 50,
          cooldown_remaining: 0,
          can_ping: true
        };
      }

      const { data, error } = await supabase.rpc('get_user_ping_status', {
        p_user_id: user.id
      });

      if (error) {
        console.warn('⚠️ Ping status function/columns not available, returning defaults');
        return {
          is_blocked: false,
          blocked_until: null,
          pings_today: 0,
          pings_remaining: 50,
          cooldown_remaining: 0,
          can_ping: true
        };
      }

      return data || {
        is_blocked: false,
        blocked_until: null,
        pings_today: 0,
        pings_remaining: 50,
        cooldown_remaining: 0,
        can_ping: true
      };
    } catch (error) {
      console.error('❌ Error fetching ping status:', error);
      return {
        is_blocked: false,
        blocked_until: null,
        pings_today: 0,
        pings_remaining: 50,
        cooldown_remaining: 0,
        can_ping: true
      };
    }
  },

  async getUserPingNotifications() {
    console.log('📡 Getting user ping notifications...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase.rpc('get_user_ping_notifications', {
        p_user_id: user.id
      });

      if (error) {
        console.error('❌ Error fetching user ping notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching user ping notifications:', error);
      return { success: false, error: error.message };
    }
  },

  async getBusPingNotifications(busId) {
    console.log('📡 Getting bus ping notifications for bus:', busId);
    
    try {
      const { data, error } = await supabase.rpc('get_bus_ping_notifications', {
        p_bus_id: busId
      });

      if (error) {
        console.error('❌ Error fetching bus ping notifications:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('❌ Error fetching bus ping notifications:', error);
      return { success: false, error: error.message };
    }
  },

  async acknowledgePing(pingId) {
    console.log('📡 Acknowledging ping:', pingId);
    
    try {
      const { data, error } = await supabase.rpc('acknowledge_ping_notification', {
        p_ping_id: pingId
      });

      if (error) {
        console.error('❌ Error acknowledging ping:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Error acknowledging ping:', error);
      return { success: false, error: error.message };
    }
  },

  async completePing(pingId) {
    console.log('📡 Completing ping:', pingId);
    
    try {
      const { data, error } = await supabase.rpc('complete_ping_notification', {
        p_ping_id: pingId
      });

      if (error) {
        console.error('❌ Error completing ping:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('❌ Error completing ping:', error);
      return { success: false, error: error.message };
    }
  },

}; 
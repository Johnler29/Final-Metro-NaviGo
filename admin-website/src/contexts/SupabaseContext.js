import React, { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const SupabaseContext = createContext();

// Supabase configuration
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'your_anon_key_here';

// Validate Supabase configuration
if (supabaseUrl === 'https://your-project-id.supabase.co' || supabaseKey === 'your_anon_key_here') {
  console.error('⚠️ Supabase configuration missing! Please set up your environment variables:');
  console.error('1. Create a .env.local file in the admin-website directory');
  console.error('2. Add your Supabase credentials:');
  console.error('   REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co');
  console.error('   REACT_APP_SUPABASE_ANON_KEY=your_anon_key_here');
  console.error('3. Restart the development server');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};

export const SupabaseProvider = ({ children }) => {
  const [buses, setBuses] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [stops, setStops] = useState([]);
  const [users, setUsers] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [refreshCount, setRefreshCount] = useState(0);
  const [showRefreshNotification, setShowRefreshNotification] = useState(false);

  // Real-time subscriptions
  useEffect(() => {
    const setupRealtimeSubscriptions = () => {
      const subscriptions = [];

      // Buses subscription
      const busesSubscription = supabase
        .channel('buses_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'buses' },
          (payload) => {
            console.log('🔄 Buses change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setBuses(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setBuses(prev => prev.map(bus => 
                bus.id === payload.new.id ? payload.new : bus
              ));
            } else if (payload.eventType === 'DELETE') {
              setBuses(prev => prev.filter(bus => bus.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(busesSubscription);

      // Routes subscription
      const routesSubscription = supabase
        .channel('routes_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'routes' },
          (payload) => {
            console.log('🔄 Routes change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setRoutes(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setRoutes(prev => prev.map(route => 
                route.id === payload.new.id ? payload.new : route
              ));
            } else if (payload.eventType === 'DELETE') {
              setRoutes(prev => prev.filter(route => route.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(routesSubscription);

      // Drivers subscription
      const driversSubscription = supabase
        .channel('drivers_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'drivers' },
          (payload) => {
            console.log('🔄 Drivers change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              console.log('✅ Adding new driver to state:', payload.new);
              setDrivers(prev => {
                // Check if driver already exists to avoid duplicates
                const exists = prev.some(driver => driver.id === payload.new.id);
                if (exists) {
                  console.log('⚠️ Driver already exists, skipping duplicate');
                  return prev;
                }
                return [...prev, payload.new];
              });
            } else if (payload.eventType === 'UPDATE') {
              console.log('✅ Updating driver in state:', payload.new);
              setDrivers(prev => prev.map(driver => 
                driver.id === payload.new.id ? payload.new : driver
              ));
            } else if (payload.eventType === 'DELETE') {
              console.log('✅ Removing driver from state:', payload.old);
              setDrivers(prev => prev.filter(driver => driver.id !== payload.old.id));
            }
          }
        )
        .subscribe((status) => {
          console.log('🔄 Drivers subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Drivers real-time subscription active');
          }
        });
      subscriptions.push(driversSubscription);

      // Schedules subscription
      const schedulesSubscription = supabase
        .channel('schedules_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'schedules' },
          (payload) => {
            console.log('🔄 Schedules change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setSchedules(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setSchedules(prev => prev.map(schedule => 
                schedule.id === payload.new.id ? payload.new : schedule
              ));
            } else if (payload.eventType === 'DELETE') {
              setSchedules(prev => prev.filter(schedule => schedule.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(schedulesSubscription);

      // Stops subscription
      const stopsSubscription = supabase
        .channel('stops_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'stops' },
          (payload) => {
            console.log('🔄 Stops change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setStops(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setStops(prev => prev.map(stop => 
                stop.id === payload.new.id ? payload.new : stop
              ));
            } else if (payload.eventType === 'DELETE') {
              setStops(prev => prev.filter(stop => stop.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(stopsSubscription);

      // Users subscription
      const usersSubscription = supabase
        .channel('users_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            console.log('🔄 Users change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setUsers(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setUsers(prev => prev.map(user => 
                user.id === payload.new.id ? payload.new : user
              ));
            } else if (payload.eventType === 'DELETE') {
              setUsers(prev => prev.filter(user => user.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(usersSubscription);

      // Feedback subscription
      const feedbackSubscription = supabase
        .channel('feedback_changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'feedback' },
          (payload) => {
            console.log('🔄 Feedback change received:', payload);
            setLastUpdate(new Date());
            if (payload.eventType === 'INSERT') {
              setFeedback(prev => [...prev, payload.new]);
            } else if (payload.eventType === 'UPDATE') {
              setFeedback(prev => prev.map(feedback => 
                feedback.id === payload.new.id ? payload.new : feedback
              ));
            } else if (payload.eventType === 'DELETE') {
              setFeedback(prev => prev.filter(feedback => feedback.id !== payload.old.id));
            }
          }
        )
        .subscribe();
      subscriptions.push(feedbackSubscription);

      return () => {
        subscriptions.forEach(subscription => {
          supabase.removeChannel(subscription);
        });
      };
    };

    const unsubscribe = setupRealtimeSubscriptions();
    return unsubscribe;
  }, []);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load all data in parallel
        const [busesResult, routesResult, driversResult, schedulesResult, stopsResult, usersResult, feedbackResult] = await Promise.all([
          supabase.from('buses').select('*').order('created_at', { ascending: false }),
          supabase.from('routes').select('*').order('created_at', { ascending: false }),
          supabase.from('drivers').select('*').order('created_at', { ascending: false }),
          supabase.from('schedules').select('*').order('created_at', { ascending: false }),
          supabase.from('stops').select('*').order('created_at', { ascending: false }),
          supabase.from('users').select('*').order('created_at', { ascending: false }),
          supabase.from('feedback').select('*').order('created_at', { ascending: false })
        ]);

        if (busesResult.error) throw busesResult.error;
        if (routesResult.error) throw routesResult.error;
        if (driversResult.error) throw driversResult.error;
        if (schedulesResult.error) throw schedulesResult.error;
        if (stopsResult.error) throw stopsResult.error;
        if (usersResult.error) throw usersResult.error;
        if (feedbackResult.error) throw feedbackResult.error;

        setBuses(busesResult.data || []);
        setRoutes(routesResult.data || []);
        setDrivers(driversResult.data || []);
        setSchedules(schedulesResult.data || []);
        setStops(stopsResult.data || []);
        setUsers(usersResult.data || []);
        setFeedback(feedbackResult.data || []);
        
      } catch (error) {
        console.error('Error loading data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      try {
        setIsRefreshing(true);
        setRefreshCount(prev => prev + 1);
        
        // Load all data in parallel
        const [busesResult, routesResult, driversResult, schedulesResult, stopsResult, usersResult, feedbackResult] = await Promise.all([
          supabase.from('buses').select('*').order('created_at', { ascending: false }),
          supabase.from('routes').select('*').order('created_at', { ascending: false }),
          supabase.from('drivers').select('*').order('created_at', { ascending: false }),
          supabase.from('schedules').select('*').order('created_at', { ascending: false }),
          supabase.from('stops').select('*').order('created_at', { ascending: false }),
          supabase.from('users').select('*').order('created_at', { ascending: false }),
          supabase.from('feedback').select('*').order('created_at', { ascending: false })
        ]);

        // Only update if there are no errors
        if (!busesResult.error && !routesResult.error && !driversResult.error && 
            !schedulesResult.error && !stopsResult.error && !usersResult.error && !feedbackResult.error) {
          
          setBuses(busesResult.data || []);
          setRoutes(routesResult.data || []);
          setDrivers(driversResult.data || []);
          setSchedules(schedulesResult.data || []);
          setStops(stopsResult.data || []);
          setUsers(usersResult.data || []);
          setFeedback(feedbackResult.data || []);
          setLastUpdate(new Date());
          
          // Show refresh notification
          setShowRefreshNotification(true);
          setTimeout(() => setShowRefreshNotification(false), 3000);
          
          console.log('🔄 Auto-refresh completed at', new Date().toLocaleTimeString());
        }
      } catch (error) {
        console.error('Auto-refresh error:', error);
      } finally {
        setIsRefreshing(false);
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, supabase]);

  // CRUD operations
  const createBus = async (busData) => {
    const { data, error } = await supabase
      .from('buses')
      .insert([busData])
      .select();
    
    if (error) throw error;
    
    // If a driver is assigned, create the assignment record
    if (data[0] && data[0].driver_id) {
      const { error: assignmentError } = await supabase
        .from('driver_bus_assignments')
        .insert([{
          driver_id: data[0].driver_id,
          bus_id: data[0].id,
          assigned_by: (await supabase.auth.getUser()).data.user?.id
        }]);
      
      if (assignmentError) {
        console.error('Error creating driver assignment:', assignmentError);
        // Don't throw error here as the bus was created successfully
      }
    }
    
    return data[0];
  };

  const updateBus = async (id, updates) => {
    // IMPORTANT: When assigning a driver, don't auto-activate the bus
    // Driver must manually go on duty to activate
    const safeUpdates = { ...updates };
    
    // If driver_id is being assigned and status is not explicitly set, ensure bus stays inactive
    if (safeUpdates.driver_id !== undefined && safeUpdates.driver_id !== null) {
      // Only set status if it's explicitly provided, otherwise keep existing status (likely inactive)
      if (safeUpdates.status === undefined) {
        // Don't change status - let it remain as is (inactive by default)
        // The driver will activate it when they go on duty
      }
    }
    
    const { data, error } = await supabase
      .from('buses')
      .update(safeUpdates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    
    // Handle driver assignment changes
    if (updates.driver_id !== undefined) {
      if (updates.driver_id) {
        // Assign driver to bus (but don't activate - driver must go on duty manually)
        // CRITICAL: Set is_active = true so mobile app can find the assignment
        const { error: assignmentError } = await supabase
          .from('driver_bus_assignments')
          .upsert([{
            driver_id: updates.driver_id,
            bus_id: id,
            is_active: true, // Explicitly set to true so mobile app can find it
            unassigned_at: null, // Clear unassigned_at if it was set
            assigned_by: (await supabase.auth.getUser()).data.user?.id
          }], {
            onConflict: 'driver_id,bus_id'
          });
        
        if (assignmentError) {
          console.error('Error creating/updating driver assignment:', assignmentError);
        }
      } else {
        // Remove driver assignment
        const { error: deleteError } = await supabase
          .from('driver_bus_assignments')
          .delete()
          .eq('bus_id', id);
        
        if (deleteError) {
          console.error('Error removing driver assignment:', deleteError);
        }
      }
    }
    
    return data[0];
  };

  const deleteBus = async (id) => {
    // First delete any driver assignments for this bus
    const { error: assignmentError } = await supabase
      .from('driver_bus_assignments')
      .delete()
      .eq('bus_id', id);
    
    if (assignmentError) {
      console.error('Error deleting driver assignments:', assignmentError);
    }
    
    // Then delete the bus
    const { error } = await supabase
      .from('buses')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  };

  const createRoute = async (routeData) => {
    const { data, error } = await supabase
      .from('routes')
      .insert([routeData])
      .select();
    
    if (error) throw error;
    return data[0];
  };

  const updateRoute = async (id, updates) => {
    const { data, error } = await supabase
      .from('routes')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  };

  const deleteRoute = async (id) => {
    // First, unassign buses from this route (set route_id to NULL)
    const { error: busesError } = await supabase
      .from('buses')
      .update({ route_id: null })
      .eq('route_id', id);
    
    if (busesError) {
      console.error('Error unassigning buses:', busesError);
      throw busesError;
    }
    
    // Delete all stops associated with this route
    const { error: stopsError } = await supabase
      .from('stops')
      .delete()
      .eq('route_id', id);
    
    if (stopsError) {
      console.error('Error deleting stops:', stopsError);
      throw stopsError;
    }
    
    // Delete any schedules associated with this route
    const { error: schedulesError } = await supabase
      .from('schedules')
      .delete()
      .eq('route_id', id);
    
    if (schedulesError) {
      console.error('Error deleting schedules:', schedulesError);
      // Don't throw - schedules might not exist
    }
    
    // Then delete the route
    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  };

  const createDriver = async (driverData) => {
    const { data, error } = await supabase
      .from('drivers')
      .insert([driverData])
      .select();
    
    if (error) throw error;
    return data[0];
  };

  // Create driver account with authentication
  const createDriverAccount = async (driverData) => {
    try {
      let newDriver = null;
      
      // First try the RPC function
      const { data, error } = await supabase.rpc('create_driver_account', {
        p_first_name: driverData.firstName,
        p_last_name: driverData.lastName,
        p_email: driverData.email,
        p_password: driverData.password,
        p_license_number: driverData.licenseNumber,
        p_phone: driverData.phone,
        p_created_by: null // Will be set by the admin user
      });

      if (error) throw error;
      
      // If RPC succeeded, fetch the created driver
      if (data && data.driver_id) {
        const { data: driverData, error: fetchError } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', data.driver_id)
          .single();
        
        if (!fetchError && driverData) {
          newDriver = driverData;
        }
      }
      
      return { success: true, driver: newDriver, ...data };
    } catch (rpcError) {
      // If RPC function fails, try direct insertion
      console.log('RPC function failed, trying direct insertion:', rpcError.message);
      
      const hashedPassword = await hashPassword(driverData.password);
      
      const { data, error } = await supabase
        .from('drivers')
        .insert([{
          first_name: driverData.firstName,
          last_name: driverData.lastName,
          email: driverData.email,
          password_hash: hashedPassword,
          license_number: driverData.licenseNumber,
          phone: driverData.phone,
          is_active: true
        }])
        .select();

      if (error) throw error;
      
      // Immediately update local state
      if (data && data[0]) {
        setDrivers(prev => [...prev, data[0]]);
        console.log('✅ Driver immediately added to local state:', data[0]);
      }
      
      return {
        success: true,
        driver: data[0],
        driver_id: data[0].id,
        message: 'Driver account created successfully'
      };
    }
  };

  // Helper function to hash password (simple implementation)
  const hashPassword = async (password) => {
    // Simple hash function using Web Crypto API (works in browsers)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Get user statistics
  const getUserStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_statistics');
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading user statistics:', error);
      // Fallback to manual calculation
      return {
        total_users: users.length,
        active_users: users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
        pending_feedback: feedback.filter(f => f.status === 'pending').length,
        support_tickets: 0
      };
    }
  };

  // Get drivers with authentication info
  const getDriversWithAuth = async () => {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  };

  // Update driver status
  const updateDriverStatus = async (driverId, status) => {
    const { data, error } = await supabase
      .from('drivers')
      .update({ is_active: status === 'active' })
      .eq('id', driverId)
      .select();
    
    if (error) throw error;
    return data[0];
  };

  // Delete driver account with proper foreign key handling
  const deleteDriverAccount = async (driverId) => {
    try {
      // First, check if driver has any assigned buses
      const { data: assignedBuses, error: busesError } = await supabase
        .from('buses')
        .select('id, bus_number, name')
        .eq('driver_id', driverId);
      
      if (busesError) throw busesError;
      
      // If driver has assigned buses, unassign them first
      if (assignedBuses && assignedBuses.length > 0) {
        const { error: unassignError } = await supabase
          .from('buses')
          .update({ driver_id: null })
          .eq('driver_id', driverId);
        
        if (unassignError) throw unassignError;
      }
      
      // Delete any driver assignments
      const { error: assignmentsError } = await supabase
        .from('driver_assignments')
        .delete()
        .eq('driver_id', driverId);
      
      if (assignmentsError) throw assignmentsError;
      
      // Now delete the driver
      const { error: deleteError } = await supabase
        .from('drivers')
        .delete()
        .eq('id', driverId);
      
      if (deleteError) throw deleteError;
      
      return { 
        success: true, 
        unassignedBuses: assignedBuses?.length || 0,
        message: assignedBuses?.length > 0 
          ? `Driver deleted successfully. ${assignedBuses.length} bus(es) have been unassigned.`
          : 'Driver deleted successfully.'
      };
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  };

  const updateDriver = async (id, updates) => {
    const { data, error } = await supabase
      .from('drivers')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return data[0];
  };

  const deleteDriver = async (id) => {
    try {
      // First, check if driver has any assigned buses
      const { data: assignedBuses, error: busesError } = await supabase
        .from('buses')
        .select('id, bus_number, name')
        .eq('driver_id', id);
      
      if (busesError) throw busesError;
      
      // If driver has assigned buses, unassign them first
      if (assignedBuses && assignedBuses.length > 0) {
        const { error: unassignError } = await supabase
          .from('buses')
          .update({ driver_id: null })
          .eq('driver_id', id);
        
        if (unassignError) throw unassignError;
      }
      
      // Delete any driver assignments
      const { error: assignmentsError } = await supabase
        .from('driver_assignments')
        .delete()
        .eq('driver_id', id);
      
      if (assignmentsError) throw assignmentsError;
      
      // Now delete the driver
      const { error: deleteError } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);
      
      if (deleteError) throw deleteError;
      
      return { 
        success: true, 
        unassignedBuses: assignedBuses?.length || 0,
        message: assignedBuses?.length > 0 
          ? `Driver deleted successfully. ${assignedBuses.length} bus(es) have been unassigned.`
          : 'Driver deleted successfully.'
      };
    } catch (error) {
      console.error('Error deleting driver:', error);
      throw error;
    }
  };

  const updateBusLocation = async (busId, locationData) => {
    const { data, error } = await supabase
      .from('buses')
      .update({
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        speed: locationData.speed,
        heading: locationData.heading,
        tracking_status: locationData.tracking_status,
        last_location_update: new Date().toISOString()
      })
      .eq('id', busId)
      .select();
    
    if (error) throw error;
    return data[0];
  };

  const getAnalytics = async () => {
    try {
      // Get various analytics data
      const [
        totalBuses,
        activeBuses,
        totalRoutes,
        totalDrivers,
        totalUsers,
        recentFeedback
      ] = await Promise.all([
        supabase.from('buses').select('id', { count: 'exact' }),
        supabase.from('buses').select('id', { count: 'exact' }).eq('status', 'active'),
        supabase.from('routes').select('id', { count: 'exact' }),
        supabase.from('drivers').select('id', { count: 'exact' }),
        supabase.from('users').select('id', { count: 'exact' }),
        supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(5)
      ]);

      return {
        totalBuses: totalBuses.count || 0,
        activeBuses: activeBuses.count || 0,
        totalRoutes: totalRoutes.count || 0,
        totalDrivers: totalDrivers.count || 0,
        totalUsers: totalUsers.count || 0,
        recentFeedback: recentFeedback.data || []
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      throw error;
    }
  };

  // Sync driver-bus assignments for existing buses
  const syncDriverBusAssignments = async () => {
    try {
      // Get buses that have driver_id but no assignment record
      const { data: busesWithDrivers, error: busesError } = await supabase
        .from('buses')
        .select('id, driver_id')
        .not('driver_id', 'is', null);
      
      if (busesError) throw busesError;
      
      // Get existing assignments
      const { data: existingAssignments, error: assignmentsError } = await supabase
        .from('driver_bus_assignments')
        .select('driver_id, bus_id');
      
      if (assignmentsError) throw assignmentsError;
      
      // Create assignments for buses that don't have them
      const assignmentsToCreate = busesWithDrivers.filter(bus => 
        !existingAssignments.some(assignment => 
          assignment.driver_id === bus.driver_id && assignment.bus_id === bus.id
        )
      );
      
      if (assignmentsToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('driver_bus_assignments')
          .insert(assignmentsToCreate.map(bus => ({
            driver_id: bus.driver_id,
            bus_id: bus.id,
            assigned_by: null // We don't know who originally assigned it
          })));
        
        if (insertError) throw insertError;
        console.log(`Created ${assignmentsToCreate.length} missing driver-bus assignments`);
      }
      
      return assignmentsToCreate.length;
    } catch (error) {
      console.error('Error syncing driver-bus assignments:', error);
      throw error;
    }
  };

  // Manual refresh function
  const refreshData = async () => {
    try {
      setIsRefreshing(true);
      setRefreshCount(prev => prev + 1);
      
      // Load all data in parallel
      const [busesResult, routesResult, driversResult, schedulesResult, stopsResult, usersResult, feedbackResult] = await Promise.all([
        supabase.from('buses').select('*').order('created_at', { ascending: false }),
        supabase.from('routes').select('*').order('created_at', { ascending: false }),
        supabase.from('drivers').select('*').order('created_at', { ascending: false }),
        supabase.from('schedules').select('*').order('created_at', { ascending: false }),
        supabase.from('stops').select('*').order('created_at', { ascending: false }),
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('feedback').select('*').order('created_at', { ascending: false })
      ]);

      if (busesResult.error) throw busesResult.error;
      if (routesResult.error) throw routesResult.error;
      if (driversResult.error) throw driversResult.error;
      if (schedulesResult.error) throw schedulesResult.error;
      if (stopsResult.error) throw stopsResult.error;
      if (usersResult.error) throw usersResult.error;
      if (feedbackResult.error) throw feedbackResult.error;

      setBuses(busesResult.data || []);
      setRoutes(routesResult.data || []);
      setDrivers(driversResult.data || []);
      setSchedules(schedulesResult.data || []);
      setStops(stopsResult.data || []);
      setUsers(usersResult.data || []);
      setFeedback(feedbackResult.data || []);
      setLastUpdate(new Date());
      
      // Show refresh notification
      setShowRefreshNotification(true);
      setTimeout(() => setShowRefreshNotification(false), 3000);
      
      console.log('🔄 Manual refresh completed at', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Manual refresh error:', error);
      setError(error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefresh(prev => !prev);
  };

  // Update refresh interval
  const updateRefreshInterval = (newInterval) => {
    setRefreshInterval(newInterval);
  };

  const value = {
    supabase,
    buses,
    routes,
    drivers,
    schedules,
    stops,
    users,
    feedback,
    loading,
    error,
    lastUpdate,
    isRefreshing,
    autoRefresh,
    refreshInterval,
    refreshCount,
    showRefreshNotification,
    refreshData,
    toggleAutoRefresh,
    updateRefreshInterval,
    createBus,
    updateBus,
    deleteBus,
    createRoute,
    updateRoute,
    deleteRoute,
    createDriver,
    updateDriver,
    deleteDriver,
    updateBusLocation,
    getAnalytics,
    syncDriverBusAssignments,
    createDriverAccount,
    getUserStatistics,
    getDriversWithAuth,
    updateDriverStatus,
    deleteDriverAccount
  };

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
};

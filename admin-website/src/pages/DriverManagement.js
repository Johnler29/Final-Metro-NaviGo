import React, { useState, useEffect, useCallback } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Users, Search, UserCheck, Trash2, Bus, MapPin } from 'lucide-react';
import { notifications } from '../utils/notifications';
import Skeleton, { SkeletonTable, SkeletonList } from '../components/Skeleton';

// Cache busting comment - Driver Management v2.0 (Add Driver removed)

const DriverManagement = () => {
  const { supabase, buses: contextBuses, drivers: contextDrivers, syncDriverBusAssignments } = useSupabase();
  const [drivers, setDrivers] = useState([]);
  const [buses, setBuses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignDriver, setShowAssignDriver] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states

  const [assignmentForm, setAssignmentForm] = useState({
    driver_id: '',
    bus_id: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use context data for drivers and buses
      setDrivers(Array.isArray(contextDrivers) ? contextDrivers : []);
      setBuses(Array.isArray(contextBuses) ? contextBuses : []);
      console.log('Using context drivers:', contextDrivers);
      console.log('Using context buses:', contextBuses);

      // Load assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('driver_bus_assignments')
        .select('*');
      
      if (assignmentsError) throw assignmentsError;
      setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, contextDrivers, contextBuses]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Update local state when context data changes
  useEffect(() => {
    if (Array.isArray(contextDrivers)) {
      setDrivers(contextDrivers);
    }
  }, [contextDrivers]);

  useEffect(() => {
    if (Array.isArray(contextBuses)) {
      setBuses(contextBuses);
      console.log('Context buses updated:', contextBuses);
    }
  }, [contextBuses]);


  const handleAssignDriver = async (e) => {
    e.preventDefault();
    try {
      // Try to get the current user ID, but don't require it
      const { data: { user } } = await supabase.auth.getUser();
      
      const assignmentData = {
        driver_id: assignmentForm.driver_id,
        bus_id: assignmentForm.bus_id
      };
      
      // Only add assigned_by if we have a valid user
      if (user?.id) {
        assignmentData.assigned_by = user.id;
      }
      
      const { data, error } = await supabase
        .from('driver_bus_assignments')
        .insert([assignmentData])
        .select('*');

      if (error) throw error;
      
      setAssignments([...assignments, ...data]);
      setAssignmentForm({ driver_id: '', bus_id: '' });
      setShowAssignDriver(false);
      notifications.driverAssigned();
    } catch (error) {
      console.error('Error assigning driver:', error);
      notifications.showError('Error assigning driver: ' + error.message);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return;
    
    try {
      const { error } = await supabase
        .from('driver_bus_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      notifications.driverUnassigned();
    } catch (error) {
      console.error('Error removing assignment:', error);
      notifications.showError('Error removing assignment: ' + error.message);
    }
  };

  const handleSyncAssignments = async () => {
    try {
      const syncedCount = await syncDriverBusAssignments();
      if (syncedCount > 0) {
        window.alert(`Synced ${syncedCount} missing driver-bus assignments!`);
        loadData();
      } else {
        window.alert('All driver-bus assignments are already in sync!');
      }
    } catch (error) {
      console.error('Error syncing assignments:', error);
      window.alert('Error syncing assignments: ' + error.message);
    }
  };

  // Safe filtering with comprehensive checks
  const safeDrivers = Array.isArray(drivers) ? drivers.filter(driver => {
    return driver && 
           typeof driver === 'object' && 
           driver.id && 
           driver.name && 
           typeof driver.name === 'string';
  }) : [];

  const filteredDrivers = safeDrivers.filter(driver => {
    if (!driver.name || !driver.email || !driver.license_number) return false;
    
    return driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           driver.license_number.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const activeDrivers = safeDrivers.filter(driver => driver && !driver.is_admin).length;
  const assignedDrivers = Array.isArray(assignments) ? assignments.length : 0;
  const availableBuses = Array.isArray(buses) ? buses.length : 0;
  
  // Debug: Check for duplicate assignments
  const busAssignments = {};
  const driverAssignments = {};
  if (Array.isArray(assignments)) {
    assignments.forEach(assignment => {
      if (assignment.bus_id) {
        busAssignments[assignment.bus_id] = (busAssignments[assignment.bus_id] || 0) + 1;
      }
      if (assignment.driver_id) {
        driverAssignments[assignment.driver_id] = (driverAssignments[assignment.driver_id] || 0) + 1;
      }
    });
  }
  
  console.log('Assignment Debug:', {
    totalAssignments: assignments.length,
    busAssignments,
    driverAssignments,
    buses: buses.length,
    drivers: safeDrivers.length
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="modern-card p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton variant="title" width="250px" height="32px" className="mb-3" />
              <Skeleton variant="text" width="400px" className="mb-2" />
              <Skeleton variant="text" width="350px" />
            </div>
            <div className="flex space-x-3">
              <Skeleton variant="button" width="150px" />
              <Skeleton variant="button" width="130px" />
            </div>
          </div>
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton variant="card" height="120px" />
          <Skeleton variant="card" height="120px" />
          <Skeleton variant="card" height="120px" />
        </div>

        {/* Table Skeleton */}
        <SkeletonTable rows={8} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Driver Management</h1>
          <p className="text-gray-600">Manage driver profiles, assignments, and performance</p>
          <p className="text-sm text-blue-600 mt-1">
            💡 To add new drivers, go to <strong>User Management</strong> → <strong>Add Driver</strong>
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={handleSyncAssignments}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserCheck className="w-4 h-4" />
            <span>Sync Assignments</span>
          </button>
          <button 
            onClick={() => setShowAssignDriver(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Bus className="w-4 h-4" />
            <span>Assign Driver</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{safeDrivers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Drivers</p>
              <p className="text-2xl font-bold text-gray-900">{activeDrivers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Bus className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
            <p className="text-sm font-medium text-gray-600">Available Buses</p>
            <p className="text-2xl font-bold text-gray-900">{availableBuses}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <MapPin className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Assignments</p>
              <p className="text-2xl font-bold text-gray-900">{assignedDrivers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Drivers</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">License</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Bus</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDrivers.length > 0 ? filteredDrivers.map((driver, index) => {
                const assignment = Array.isArray(assignments) ? assignments.find(a => a.driver_id === driver.id) : null;
                const assignedBus = assignment ? buses.find(bus => bus.id === assignment.bus_id) : null;
                
                return (
                  <tr key={driver.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {driver.name ? driver.name.split(' ').map(n => n[0]).join('') : '??'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{driver.name || 'Unknown Driver'}</div>
                          <div className="text-sm text-gray-500">{driver.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.phone || 'No phone'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {driver.license_number || 'No license'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        driver.is_admin 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {driver.is_admin ? 'Admin' : 'Driver'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {assignedBus && assignedBus.bus_number ? (
                        <div>
                          <div className="font-medium">{assignedBus.bus_number}</div>
                          <div className="text-gray-500">{assignedBus.name || 'Unknown Bus'}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setAssignmentForm({ ...assignmentForm, driver_id: driver.id });
                          setShowAssignDriver(true);
                        }}
                        className="text-primary-600 hover:text-primary-900 mr-3"
                      >
                        <Bus className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                    No drivers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Assign Driver Modal */}
      {showAssignDriver && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Assign Driver to Bus</h3>
            <form onSubmit={handleAssignDriver} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Driver</label>
                <select
                  required
                  value={assignmentForm.driver_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, driver_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a driver</option>
                  {safeDrivers.filter(d => !d.is_admin).map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Bus ({buses.length} available)
                </label>
                <select
                  required
                  value={assignmentForm.bus_id}
                  onChange={(e) => setAssignmentForm({ ...assignmentForm, bus_id: e.target.value })}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a bus</option>
                  {buses.length > 0 ? buses.map(bus => (
                    <option key={bus.id} value={bus.id}>
                      {bus.bus_number} - {bus.name} {bus.route_id ? `(Route: ${bus.route_id})` : ''}
                    </option>
                  )) : (
                    <option disabled>No buses available</option>
                  )}
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAssignDriver(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Assign Driver
                </button>
              </div>
            </form>
        </div>
      </div>
      )}
    </div>
  );
};

export default DriverManagement;

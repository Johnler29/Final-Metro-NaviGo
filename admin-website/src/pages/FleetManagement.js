import React, { useState, useEffect, useRef } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Edit, 
  Trash2, 
  MapPin,
  Bus,
  Users,
  Wrench,
  RefreshCw,
  Eye,
  Map,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { notifications } from '../utils/notifications';
import BusModal from '../components/BusModal';

const FleetManagement = () => {
  const { buses, drivers, routes, createBus, updateBus, deleteBus, updateBusLocation } = useSupabase();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedBus, setSelectedBus] = useState(null);
  const [showActions, setShowActions] = useState(null);
  const [menuPosition, setMenuPosition] = useState({});
  const actionRefs = useRef({});
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [sortBy, setSortBy] = useState('bus_number');
  const [sortOrder, setSortOrder] = useState('asc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackingFilter, setTrackingFilter] = useState('all');

  // Enhanced filtering and sorting
  const filteredBuses = buses
    .filter(bus => {
      const matchesSearch = bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           bus.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (bus.route_id && bus.route_id.toString().toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || bus.status === statusFilter;
      
      const matchesTracking = trackingFilter === 'all' || bus.tracking_status === trackingFilter;
      
      return matchesSearch && matchesStatus && matchesTracking;
    })
    .sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];
      
      // Handle different data types
      if (sortBy === 'bus_number') {
        aValue = parseInt(aValue) || 0;
        bValue = parseInt(bValue) || 0;
      } else if (sortBy === 'last_location_update') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleCreateBus = async (busData) => {
    try {
      await createBus(busData);
      notifications.busCreated();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to create bus: ' + error.message);
    }
  };

  const handleUpdateBus = async (id, updates) => {
    try {
      await updateBus(id, updates);
      notifications.busUpdated();
      setShowModal(false);
      setSelectedBus(null);
    } catch (error) {
      toast.error('Failed to update bus: ' + error.message);
    }
  };

  const handleDeleteBus = async (id) => {
    if (window.confirm('Are you sure you want to delete this bus?')) {
      try {
        await deleteBus(id);
        notifications.busDeleted();
      } catch (error) {
        toast.error('Failed to delete bus: ' + error.message);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // The data will be refreshed automatically by the context
      notifications.showInfo('Data refreshed!');
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };


  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const calculateMenuPosition = (busId) => {
    const buttonRef = actionRefs.current[busId];
    if (!buttonRef) return 'bottom';
    
    const rect = buttonRef.getBoundingClientRect();
    const menuHeight = 100; // Approximate menu height
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    
    // If not enough space below but enough space above, show above
    if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
      return 'top';
    }
    return 'bottom';
  };

  const handleToggleActions = (busId) => {
    if (showActions === busId) {
      setShowActions(null);
    } else {
      const position = calculateMenuPosition(busId);
      setMenuPosition(prev => ({ ...prev, [busId]: position }));
      setShowActions(busId);
    }
  };

  const getSystemStatus = (bus) => {
    // System-managed status based on driver assignment and recent activity
    const hasDriver = bus.driver_id && bus.driver_id !== '';
    const hasRecentActivity = bus.last_location_update && 
      new Date(bus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000);
    
    if (hasDriver && hasRecentActivity) {
      return { status: 'On Duty', color: 'bg-green-100 text-green-800' };
    } else if (hasDriver) {
      return { status: 'Assigned', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { status: 'Available', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getTrackingStatus = (bus) => {
    // System-managed tracking status based on recent activity
    const hasRecentActivity = bus.last_location_update && 
      new Date(bus.last_location_update) > new Date(Date.now() - 5 * 60 * 1000);
    
    if (hasRecentActivity) {
      return { status: 'Live', color: 'bg-green-100 text-green-800' };
    } else {
      return { status: 'Offline', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">Bus Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your bus fleet and track real-time locations</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white text-gray-700 px-3 md:px-4 py-2.5 md:py-2 rounded-lg border border-gray-200 hover:bg-gray-50 
                     hover:border-primary-500 flex items-center justify-center space-x-2 disabled:opacity-50 transition-all duration-200
                     text-sm md:text-base font-semibold flex-1 sm:flex-initial touch-manipulation min-h-[44px] sm:min-h-0"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="whitespace-nowrap">Refresh</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary-500 text-white px-3 md:px-4 py-2.5 md:py-2 rounded-lg hover:bg-primary-600 
                     flex items-center justify-center space-x-2 transition-all duration-200 text-sm md:text-base font-semibold
                     shadow-[0_2px_4px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_8px_rgba(245,158,11,0.3)] 
                     flex-1 sm:flex-initial touch-manipulation min-h-[44px] sm:min-h-0"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="whitespace-nowrap">Add Bus</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-4 md:mb-6 relative z-0">
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] relative">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <Bus className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Buses</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{buses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
              <MapPin className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Active Buses</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {buses.filter(bus => bus.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <Wrench className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">In Maintenance</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {buses.filter(bus => bus.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">With Drivers</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
                {buses.filter(bus => bus.driver_id).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                      shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] relative z-10">
        <div className="flex flex-col gap-4">
          {/* Search Bar - Full Width */}
          <div className="w-full">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
              <input
                type="text"
                placeholder="Search buses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 md:pl-12 pr-4 py-2.5 md:py-3 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                         transition-all duration-200 text-sm md:text-base"
              />
            </div>
          </div>
          
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="w-full">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                         transition-all duration-200 text-sm md:text-base"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            
            <div className="w-full">
              <select
                value={trackingFilter}
                onChange={(e) => setTrackingFilter(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                         transition-all duration-200 text-sm md:text-base"
              >
                <option value="all">All Tracking</option>
                <option value="moving">Moving</option>
                <option value="stopped">Stopped</option>
                <option value="at_stop">At Stop</option>
              </select>
            </div>
            
            <div className="w-full">
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [column, order] = e.target.value.split('-');
                  setSortBy(column);
                  setSortOrder(order);
                }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                         transition-all duration-200 text-sm md:text-base"
              >
                <option value="bus_number-asc">Bus Number (A-Z)</option>
                <option value="bus_number-desc">Bus Number (Z-A)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
                <option value="last_location_update-desc">Last Update (Newest)</option>
                <option value="last_location_update-asc">Last Update (Oldest)</option>
              </select>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center justify-end sm:justify-start gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 md:p-3 rounded-lg transition-all duration-200 ${
                  viewMode === 'table' 
                    ? 'bg-primary-100 text-primary-600 border border-primary-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
                aria-label="Table view"
              >
                <Filter className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2.5 md:p-3 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid' 
                    ? 'bg-primary-100 text-primary-600 border border-primary-200' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-transparent'
                }`}
                aria-label="Grid view"
              >
                <Map className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 md:p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary-600 mr-2 flex-shrink-0" />
            <span className="text-sm md:text-base font-semibold text-gray-900">
              Showing {filteredBuses.length} of {buses.length} buses
            </span>
          </div>
          <div className="flex items-center flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-700">
            <span className="whitespace-nowrap">On Duty: {buses.filter(b => getSystemStatus(b).status === 'On Duty').length}</span>
            <span className="hidden sm:inline text-gray-400">•</span>
            <span className="whitespace-nowrap">Live: {buses.filter(b => getTrackingStatus(b).status === 'Live').length}</span>
            <span className="hidden sm:inline text-gray-400">•</span>
            <span className="whitespace-nowrap">With Location: {buses.filter(b => b.latitude && b.longitude).length}</span>
          </div>
        </div>
      </div>

      {/* Buses Display */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-[22px] border border-gray-200 overflow-hidden
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="overflow-x-auto -mx-4 sm:mx-0 overflow-y-auto" style={{ maxHeight: '70vh' }}>
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th 
                      className="px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider 
                               cursor-pointer hover:bg-gray-100 transition-colors duration-200 sticky left-0 bg-gray-50 z-10"
                      onClick={() => handleSort('bus_number')}
                    >
                      <div className="flex items-center whitespace-nowrap">
                        Bus
                        {sortBy === 'bus_number' && (
                          <span className="ml-1 text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider 
                               cursor-pointer hover:bg-gray-100 transition-colors duration-200 hidden sm:table-cell"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center whitespace-nowrap">
                        Status
                        {sortBy === 'status' && (
                          <span className="ml-1 text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Location
                    </th>
                    <th className="px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Driver
                    </th>
                    <th 
                      className="px-3 md:px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider 
                               cursor-pointer hover:bg-gray-100 transition-colors duration-200 hidden md:table-cell"
                      onClick={() => handleSort('last_location_update')}
                    >
                      <div className="flex items-center whitespace-nowrap">
                        Last Update
                        {sortBy === 'last_location_update' && (
                          <span className="ml-1 text-primary-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="px-3 md:px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBuses.map((bus) => {
                    const driver = drivers.find(d => d.id === bus.driver_id);
                    
                    return (
                      <tr key={bus.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 sticky left-0 bg-white z-0">
                          <div className="flex items-center min-w-0">
                            <div className="w-8 h-8 md:w-10 md:h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Bus className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />
                            </div>
                            <div className="ml-2 md:ml-3 lg:ml-4 min-w-0">
                              <div className="text-sm md:text-base font-semibold text-gray-900 truncate">
                                {bus.name || `Bus ${bus.bus_number}`}
                              </div>
                              <div className="text-xs md:text-sm text-gray-500 truncate">
                                {bus.route_id ? `Route ${bus.route_id.slice(-3)}` : 'No route'}
                              </div>
                              {/* Mobile-only: Show status badges */}
                              <div className="flex items-center gap-1.5 mt-1 sm:hidden">
                                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getSystemStatus(bus).color}`}>
                                  {getSystemStatus(bus).status}
                                </span>
                                <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getTrackingStatus(bus).color}`}>
                                  {getTrackingStatus(bus).status}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 hidden sm:table-cell">
                          <div className="space-y-1.5">
                            <div className="flex items-center">
                              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getSystemStatus(bus).color}`}>
                                {getSystemStatus(bus).status}
                              </span>
                            </div>
                            <div className="flex items-center">
                              <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getTrackingStatus(bus).color}`}>
                                {getTrackingStatus(bus).status}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 hidden md:table-cell">
                          {bus.latitude && bus.longitude ? (
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 md:w-4 md:h-4 text-green-500 mr-1 flex-shrink-0" />
                              <span className="text-xs md:text-sm text-green-600 font-medium">Live</span>
                            </div>
                          ) : (
                            <span className="text-xs md:text-sm text-gray-500">No location</span>
                          )}
                        </td>
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 hidden lg:table-cell">
                          {driver ? (
                            <div className="min-w-0">
                              <div className="text-xs md:text-sm font-semibold text-gray-900 truncate">
                                {driver.first_name} {driver.last_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">{driver.license_number}</div>
                            </div>
                          ) : (
                            <span className="text-xs md:text-sm text-gray-500">No driver</span>
                          )}
                        </td>
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 hidden md:table-cell">
                          <span className="text-xs md:text-sm text-gray-500 whitespace-nowrap">
                            {bus.last_location_update ? (
                              <>
                                <span className="hidden lg:inline">
                                  {new Date(bus.last_location_update).toLocaleString()}
                                </span>
                                <span className="lg:hidden">
                                  {new Date(bus.last_location_update).toLocaleDateString()}
                                </span>
                              </>
                            ) : (
                              'Never'
                            )}
                          </span>
                        </td>
                        <td className="px-3 md:px-4 lg:px-6 py-3 md:py-4 text-right sticky right-0 bg-white z-0">
                          <div className="relative inline-block">
                            <button
                              ref={(el) => { actionRefs.current[bus.id] = el; }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleActions(bus.id);
                              }}
                              className="text-gray-400 hover:text-primary-600 transition-colors duration-200 p-1.5 md:p-2 rounded-lg hover:bg-gray-100 touch-manipulation"
                              aria-label="More actions"
                            >
                              <MoreVertical className="w-4 h-4 md:w-5 md:h-5" />
                            </button>
                            
                            {showActions === bus.id && (
                              <>
                                {/* Backdrop to close menu */}
                                <div 
                                  className="fixed inset-0 z-[100]"
                                  onClick={() => setShowActions(null)}
                                />
                                <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-lg z-[110] border border-gray-200
                                              animate-scale-in ${
                                                menuPosition[bus.id] === 'top' 
                                                  ? 'bottom-full mb-2' 
                                                  : 'top-full mt-2'
                                              }`}>
                                  <div className="py-1">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedBus(bus);
                                        setShowModal(true);
                                        setShowActions(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150 touch-manipulation"
                                    >
                                      <Edit className="w-4 h-4 mr-3 flex-shrink-0" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteBus(bus.id);
                                        setShowActions(null);
                                      }}
                                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-700 hover:bg-red-50 transition-colors duration-150 touch-manipulation"
                                    >
                                      <Trash2 className="w-4 h-4 mr-3 flex-shrink-0" />
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {filteredBuses.map((bus) => {
            const driver = drivers.find(d => d.id === bus.driver_id);
            
            return (
              <div key={bus.id} className="bg-white rounded-[22px] border border-gray-200 p-4 md:p-6 
                                          shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
                                          hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]
                                          hover:border-primary-500 transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Bus className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
                    </div>
                    <div className="ml-3 min-w-0">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate">
                        {bus.name || `Bus ${bus.bus_number}`}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-500 truncate">
                        {bus.route_id ? `Route ${bus.route_id.slice(-3)}` : 'No route assigned'}
                      </p>
                    </div>
                  </div>
                  <div className="relative flex-shrink-0 ml-2">
                    <button
                      ref={(el) => { actionRefs.current[bus.id] = el; }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActions(bus.id);
                      }}
                      className="text-gray-400 hover:text-primary-600 transition-colors duration-200 p-1 rounded-lg hover:bg-gray-100"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    
                    {showActions === bus.id && (
                      <>
                        {/* Backdrop to close menu */}
                        <div 
                          className="fixed inset-0 z-[100]"
                          onClick={() => setShowActions(null)}
                        />
                        <div className={`absolute right-0 w-48 bg-white rounded-xl shadow-lg z-[110] border border-gray-200
                                      animate-scale-in ${
                                        menuPosition[bus.id] === 'top' 
                                          ? 'bottom-full mb-2' 
                                          : 'top-full mt-2'
                                      }`}>
                          <div className="py-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedBus(bus);
                                setShowModal(true);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            >
                              <Edit className="w-4 h-4 mr-3" />
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBus(bus.id);
                                setShowActions(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50 transition-colors duration-150"
                            >
                              <Trash2 className="w-4 h-4 mr-3" />
                              Delete
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">Status</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getSystemStatus(bus).color}`}>
                      {getSystemStatus(bus).status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">Tracking</span>
                    <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${getTrackingStatus(bus).color}`}>
                      {getTrackingStatus(bus).status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">Location</span>
                    {bus.latitude && bus.longitude ? (
                      <div className="flex items-center text-green-600">
                        <MapPin className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                        <span className="text-xs md:text-sm font-medium">Live</span>
                      </div>
                    ) : (
                      <span className="text-xs md:text-sm text-gray-500">No location</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">Driver</span>
                    {driver ? (
                      <span className="text-xs md:text-sm text-gray-900 font-medium truncate ml-2">
                        {driver.first_name} {driver.last_name}
                      </span>
                    ) : (
                      <span className="text-xs md:text-sm text-gray-500">No driver</span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs md:text-sm text-gray-600">Last Update</span>
                    <span className="text-xs md:text-sm text-gray-500 truncate ml-2">
                      {bus.last_location_update ? (
                        new Date(bus.last_location_update).toLocaleDateString()
                      ) : (
                        'Never'
                      )}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bus Modal */}
      {showModal && (
        <BusModal
          bus={selectedBus}
          routes={routes}
          drivers={drivers}
          onClose={() => {
            setShowModal(false);
            setSelectedBus(null);
          }}
          onSave={selectedBus ? handleUpdateBus : handleCreateBus}
        />
      )}
    </div>
  );
};

export default FleetManagement;

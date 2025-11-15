import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  MapPin,
  User,
  Bus,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  MessageSquare
} from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { toast } from 'react-hot-toast';

const PingNotifications = () => {
  const { supabase } = useSupabase();
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    acknowledged: 0,
    completed: 0,
    cancelled: 0
  });

  // Load ping notifications
  const loadPings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ping_notifications')
        .select(`
          *,
          buses:bus_id (
            id,
            bus_number,
            name,
            route_id
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Try to get user information from users table
      const pingsWithUsers = await Promise.all(
        (data || []).map(async (ping) => {
          let userEmail = 'Unknown';
          let userName = null;
          
          if (ping.user_id) {
            // Try to get from users table first
            const { data: userData } = await supabase
              .from('users')
              .select('email, name')
              .eq('id', ping.user_id)
              .single();
            
            if (userData) {
              userEmail = userData.email || 'No email';
              userName = userData.name;
            } else {
              // Fallback: show user ID
              userEmail = `User ${ping.user_id.slice(0, 8)}...`;
            }
          }
          
          return {
            ...ping,
            user_email: userEmail,
            user_name: userName
          };
        })
      );

      setPings(pingsWithUsers);
      calculateStats(pingsWithUsers);
    } catch (error) {
      console.error('Error loading pings:', error);
      toast.error('Failed to load ping notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Calculate statistics
  const calculateStats = (pingData) => {
    const stats = {
      total: pingData.length,
      pending: 0,
      acknowledged: 0,
      completed: 0,
      cancelled: 0
    };

    pingData.forEach(ping => {
      if (ping.status === 'pending') stats.pending++;
      else if (ping.status === 'acknowledged') stats.acknowledged++;
      else if (ping.status === 'completed') stats.completed++;
      else if (ping.status === 'cancelled') stats.cancelled++;
    });

    setStats(stats);
  };

  // Update ping status
  const updatePingStatus = async (pingId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'acknowledged') {
        updateData.acknowledged_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('ping_notifications')
        .update(updateData)
        .eq('id', pingId);

      if (error) throw error;

      toast.success(`Ping marked as ${newStatus}`);
      loadPings();
    } catch (error) {
      console.error('Error updating ping:', error);
      toast.error('Failed to update ping status');
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPings();
  };

  // Filter pings
  const filteredPings = pings.filter(ping => {
    const matchesSearch = 
      ping.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ping.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ping.buses?.bus_number?.toString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || ping.status === statusFilter;
    const matchesType = typeFilter === 'all' || ping.ping_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'acknowledged': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get type badge color
  const getTypeColor = (type) => {
    switch (type) {
      case 'ride_request': return 'bg-purple-100 text-purple-800';
      case 'eta_request': return 'bg-indigo-100 text-indigo-800';
      case 'location_request': return 'bg-teal-100 text-teal-800';
      case 'general_message': return 'bg-gray-100 text-gray-800';
      case 'emergency': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  useEffect(() => {
    loadPings();

    // Set up real-time subscription
    const channel = supabase
      .channel('ping_notifications_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'ping_notifications' },
        () => {
          loadPings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading && pings.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading ping notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-amber-500" />
            Ping Notifications
          </h1>
          <p className="text-gray-600 mt-1">Manage and monitor passenger ping notifications</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Total Pings</div>
          <div className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Pending</div>
          <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pending}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Acknowledged</div>
          <div className="text-2xl font-bold text-blue-600 mt-1">{stats.acknowledged}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Completed</div>
          <div className="text-2xl font-bold text-green-600 mt-1">{stats.completed}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="text-sm text-gray-600">Cancelled</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.cancelled}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by message, user, or bus..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="ride_request">Ride Request</option>
            <option value="eta_request">ETA Request</option>
            <option value="location_request">Location Request</option>
            <option value="general_message">General Message</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>
      </div>

      {/* Pings List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredPings.length === 0 ? (
          <div className="p-12 text-center">
            <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No ping notifications found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredPings.map((ping) => (
              <div key={ping.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(ping.status)}`}>
                        {ping.status}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${getTypeColor(ping.ping_type)}`}>
                        {ping.ping_type?.replace('_', ' ')}
                      </span>
                      {ping.ping_type === 'emergency' && (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    
                    {ping.message && (
                      <div className="flex items-start gap-2 mb-3">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                        <p className="text-gray-700">{ping.message}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4" />
                        <span>{ping.user_name || ping.user_email || 'Unknown User'}</span>
                      </div>
                      {ping.buses && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Bus className="w-4 h-4" />
                          <span>Bus {ping.buses.bus_number} - {ping.buses.name}</span>
                        </div>
                      )}
                      {ping.location_address && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          <span className="truncate">{ping.location_address}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Created: {formatDate(ping.created_at)}
                      </div>
                      {ping.acknowledged_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Acknowledged: {formatDate(ping.acknowledged_at)}
                        </div>
                      )}
                      {ping.completed_at && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Completed: {formatDate(ping.completed_at)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {ping.status === 'pending' && (
                      <>
                        <button
                          onClick={() => updatePingStatus(ping.id, 'acknowledged')}
                          className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => updatePingStatus(ping.id, 'cancelled')}
                          className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                        >
                          Cancel
                        </button>
                      </>
                    )}
                    {ping.status === 'acknowledged' && (
                      <button
                        onClick={() => updatePingStatus(ping.id, 'completed')}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                      >
                        Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PingNotifications;


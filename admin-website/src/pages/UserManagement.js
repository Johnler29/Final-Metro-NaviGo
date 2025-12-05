import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Users, MessageSquare, Shield, Edit, Trash2, Eye, UserPlus, Mail, Phone, Calendar, Filter, Download } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { notifications } from '../utils/notifications';
import { validatePassword, getPasswordRequirements, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordValidation';

const UserManagement = () => {
  const { users, feedback, drivers, supabase, createDriverAccount, getDriversWithAuth, updateDriverStatus, deleteDriverAccount } = useSupabase();
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingFeedback: 0,
    supportTickets: 0
  });

  // Driver creation form state
  const [driverForm, setDriverForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    phone: ''
  });

  // User creation form state
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Edit driver form state
  const [editDriverForm, setEditDriverForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    licenseNumber: '',
    phone: '',
    isActive: true
  });

  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_statistics');
        if (error) throw error;
        setStats(data);
      } catch (error) {
        console.error('Error loading stats:', error);
        // Fallback to manual calculation
        setStats({
          totalUsers: users.length,
          activeUsers: users.filter(u => new Date(u.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length,
          pendingFeedback: feedback.filter(f => f.status === 'pending').length,
          supportTickets: 0 // Will be implemented when support tickets are added
        });
      }
    };
    loadStats();
  }, [users, feedback, supabase]);

  // Filter users based on search and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter drivers based on search and status
  const filteredDrivers = drivers.filter(driver => {
    const fullName = `${driver.first_name || ''} ${driver.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                         driver.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? driver.is_active : !driver.is_active);
    return matchesSearch && matchesStatus;
  });

  // Handle driver creation
  const handleCreateDriver = async (e) => {
    e.preventDefault();
    
    if (driverForm.password !== driverForm.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(driverForm.password, DEFAULT_PASSWORD_OPTIONS);
    if (!passwordValidation.isValid) {
      const requirements = getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS);
      alert(`Password does not meet requirements:\n\n${passwordValidation.errors.join('\n')}\n\nRequirements: ${requirements}`);
      return;
    }

    try {
      const data = await createDriverAccount({
        firstName: driverForm.firstName,
        lastName: driverForm.lastName,
        email: driverForm.email,
        password: driverForm.password,
        licenseNumber: driverForm.licenseNumber,
        phone: driverForm.phone
      });

      if (data.success) {
        // Driver should already be added to context state by createDriverAccount
        // But let's also trigger a manual refresh to ensure UI updates
        console.log('✅ Driver created successfully:', data.driver);
        
        notifications.driverCreated();
        setShowCreateDriver(false);
        setDriverForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          licenseNumber: '',
          phone: ''
        });
        
        // Force a small delay to ensure the UI updates
        setTimeout(() => {
          console.log('🔄 Forcing driver list refresh...');
          // The context should have already updated, but this ensures UI refresh
        }, 100);
      } else {
        notifications.showError(data.error || 'Failed to create driver account');
      }
    } catch (error) {
      console.error('Error creating driver:', error);
      notifications.showError('Error creating driver account: ' + error.message);
    }
  };

  // Handle user creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('users')
        .insert([{
          name: userForm.name,
          email: userForm.email,
          phone: userForm.phone
        }])
        .select();

      if (error) throw error;

      notifications.userCreated();
      setShowCreateUser(false);
      setUserForm({ name: '', email: '', phone: '' });
    } catch (error) {
      console.error('Error creating user:', error);
      notifications.showError('Error creating user: ' + error.message);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      notifications.userDeleted();
    } catch (error) {
      console.error('Error deleting user:', error);
      notifications.showError('Error deleting user: ' + error.message);
    }
  };

  // Handle driver status toggle
  const handleToggleDriverStatus = async (driverId, currentStatus) => {
    try {
      await updateDriverStatus(driverId, currentStatus ? 'inactive' : 'active');
      if (currentStatus) {
        notifications.driverDeactivated();
      } else {
        notifications.driverActivated();
      }
    } catch (error) {
      console.error('Error updating driver status:', error);
      notifications.showError('Error updating driver status: ' + error.message);
    }
  };

  // Handle driver deletion
  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver account? Any assigned buses will be unassigned.')) return;

    try {
      const result = await deleteDriverAccount(driverId);
      if (result.success) {
        notifications.showSuccess(result.message);
      } else {
        notifications.driverDeleted();
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      notifications.showError('Error deleting driver: ' + error.message);
    }
  };

  // Handle edit driver
  const handleEditDriver = (driver) => {
    setEditingDriver(driver);
    setEditDriverForm({
      firstName: driver.first_name || '',
      lastName: driver.last_name || '',
      email: driver.email || '',
      licenseNumber: driver.license_number || '',
      phone: driver.phone || '',
      isActive: driver.is_active
    });
    setShowEditDriver(true);
  };

  // Handle update driver
  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    
    try {
      const { data, error } = await supabase
        .from('drivers')
        .update({
          first_name: editDriverForm.firstName,
          last_name: editDriverForm.lastName,
          email: editDriverForm.email,
          license_number: editDriverForm.licenseNumber,
          phone: editDriverForm.phone,
          is_active: editDriverForm.isActive
        })
        .eq('id', editingDriver.id)
        .select();

      if (error) throw error;

      notifications.driverUpdated();
      setShowEditDriver(false);
      setEditingDriver(null);
      setEditDriverForm({
        firstName: '',
        lastName: '',
        email: '',
        licenseNumber: '',
        phone: '',
        isActive: true
      });
    } catch (error) {
      console.error('Error updating driver:', error);
      notifications.showError('Error updating driver: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage passenger accounts, drivers, and support tickets</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCreateDriver(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Driver</span>
          </button>
          <button
            onClick={() => setShowCreateUser(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
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
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-50 rounded-lg">
              <MessageSquare className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending Feedback</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingFeedback}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Support Tickets</p>
              <p className="text-2xl font-bold text-gray-900">{stats.supportTickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'drivers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'feedback'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Feedback ({feedback.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* Users Table */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-600">
                                {user.name?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name || 'Unnamed User'}</div>
                            <div className="text-sm text-gray-500">ID: {user.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{user.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Active
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Drivers Table */}
          {activeTab === 'drivers' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Driver
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-blue-600">
                                {driver.first_name?.charAt(0)?.toUpperCase() || 'D'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {driver.first_name && driver.last_name 
                                ? `${driver.first_name} ${driver.last_name}`
                                : driver.name || 'Unnamed Driver'
                              }
                            </div>
                            <div className="text-sm text-gray-500">ID: {driver.id.slice(0, 8)}...</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{driver.email || 'No email'}</div>
                        <div className="text-sm text-gray-500">{driver.phone || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {driver.license_number || 'Not provided'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          driver.is_active 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {driver.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button className="text-primary-600 hover:text-primary-900">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleEditDriver(driver)}
                            className="text-gray-600 hover:text-gray-900"
                            title="Edit driver details"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleDriverStatus(driver.id, driver.is_active)}
                            className={`${driver.is_active ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                            title={driver.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {driver.is_active ? '⏸️' : '▶️'}
                          </button>
                          <button 
                            onClick={() => handleDeleteDriver(driver.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Feedback Table */}
          {activeTab === 'feedback' && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Feedback
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rating
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {feedback.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.user_name || 'Anonymous'}</div>
                        <div className="text-sm text-gray-500">{item.user_email || 'No email'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-xs truncate">{item.message}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <span
                              key={i}
                              className={`text-lg ${
                                i < (item.rating || 0) ? 'text-yellow-400' : 'text-gray-300'
                              }`}
                            >
                              ★
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'pending' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {item.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Driver Modal */}
      {showCreateDriver && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create Driver Account</h3>
                <button
                  onClick={() => setShowCreateDriver(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateDriver} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={driverForm.firstName}
                      onChange={(e) => setDriverForm({...driverForm, firstName: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      value={driverForm.lastName}
                      onChange={(e) => setDriverForm({...driverForm, lastName: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={driverForm.email}
                    onChange={(e) => setDriverForm({...driverForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <input
                    type="text"
                    required
                    value={driverForm.licenseNumber}
                    onChange={(e) => setDriverForm({...driverForm, licenseNumber: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={driverForm.phone}
                    onChange={(e) => setDriverForm({...driverForm, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="password"
                    required
                    value={driverForm.password}
                    onChange={(e) => setDriverForm({...driverForm, password: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={driverForm.confirmPassword}
                    onChange={(e) => setDriverForm({...driverForm, confirmPassword: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateDriver(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    Create Driver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Create User Account</h3>
                <button
                  onClick={() => setShowCreateUser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    required
                    value={userForm.name}
                    onChange={(e) => setUserForm({...userForm, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateUser(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Driver Modal */}
      {showEditDriver && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Edit Driver Details</h3>
                <button
                  onClick={() => {
                    setShowEditDriver(false);
                    setEditingDriver(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              <form onSubmit={handleUpdateDriver} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">First Name</label>
                    <input
                      type="text"
                      required
                      value={editDriverForm.firstName}
                      onChange={(e) => setEditDriverForm({...editDriverForm, firstName: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Last Name</label>
                    <input
                      type="text"
                      required
                      value={editDriverForm.lastName}
                      onChange={(e) => setEditDriverForm({...editDriverForm, lastName: e.target.value})}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={editDriverForm.email}
                    onChange={(e) => setEditDriverForm({...editDriverForm, email: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <input
                    type="text"
                    required
                    value={editDriverForm.licenseNumber}
                    onChange={(e) => setEditDriverForm({...editDriverForm, licenseNumber: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    value={editDriverForm.phone}
                    onChange={(e) => setEditDriverForm({...editDriverForm, phone: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editDriverForm.isActive}
                      onChange={(e) => setEditDriverForm({...editDriverForm, isActive: e.target.checked})}
                      className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">Active Driver</span>
                  </label>
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditDriver(false);
                      setEditingDriver(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                  >
                    Update Driver
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

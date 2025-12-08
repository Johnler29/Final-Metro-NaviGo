import React, { useState, useEffect } from 'react';
import { UserCheck, Plus, Search, Users, MessageSquare, Shield, Edit, Trash2, Eye, UserPlus, Mail, Phone, Calendar, Filter, Download } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { notifications } from '../utils/notifications';
import { validatePassword, getPasswordRequirements, DEFAULT_PASSWORD_OPTIONS } from '../utils/passwordValidation';
import Modal from '../components/Modal';

const UserManagement = () => {
  const { users, feedback, drivers, supabase, createDriverAccount, getDriversWithAuth, updateDriverStatus, deleteDriverAccount, createAdminAccount } = useSupabase();
  const [activeTab, setActiveTab] = useState('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingFeedback: 0,
    supportTickets: 0
  });

  const isAnyModalOpen = showCreateDriver || showCreateUser || showCreateAdmin || showEditDriver;

  // Prevent background scrolling when any modal is open
  useEffect(() => {
    if (isAnyModalOpen) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }

    return () => {
      document.body.classList.remove('overflow-hidden');
    };
  }, [isAnyModalOpen]);

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

  // Admin creation form state
  const [adminForm, setAdminForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'admin',
    department: '',
    phone: ''
  });

  // Debug: Test users query directly
  useEffect(() => {
    const testUsersQuery = async () => {
      try {
        console.log('🔍 Testing users query...');
        const { data, error, count } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('❌ Users query error:', error);
          console.error('Error details:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
          });
        } else {
          console.log(`✅ Users query successful: ${data?.length || 0} users found (total count: ${count})`);
          console.log('Sample user:', data?.[0]);
        }
      } catch (err) {
        console.error('❌ Exception testing users query:', err);
      }
    };
    
    // Test after a short delay to ensure context is loaded
    const timer = setTimeout(testUsersQuery, 1000);
    return () => clearTimeout(timer);
  }, [supabase]);

  // Load statistics - use actual data from context
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Try RPC function first
        const { data, error } = await supabase.rpc('get_user_statistics');
        if (!error && data) {
          // Handle both object and array responses
          const statsData = Array.isArray(data) ? data[0] : data;
          setStats({
            totalUsers: statsData?.total_users ?? statsData?.totalUsers ?? users.length,
            activeUsers: statsData?.active_users ?? statsData?.activeUsers ?? users.filter(u => {
              const createdAt = new Date(u.created_at);
              const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
              return createdAt > thirtyDaysAgo;
            }).length,
            pendingFeedback: statsData?.pending_feedback ?? statsData?.pendingFeedback ?? feedback.filter(f => f.status === 'pending').length,
            supportTickets: statsData?.support_tickets ?? statsData?.supportTickets ?? 0
          });
        } else {
          throw new Error('RPC function not available or returned error');
        }
      } catch (error) {
        console.log('Using manual calculation for stats:', error.message);
        // Fallback to manual calculation using actual context data
        const now = Date.now();
        const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
        
        setStats({
          totalUsers: Array.isArray(users) ? users.length : 0,
          activeUsers: Array.isArray(users) ? users.filter(u => {
            if (!u.created_at) return false;
            const createdAt = new Date(u.created_at).getTime();
            return createdAt > thirtyDaysAgo;
          }).length : 0,
          pendingFeedback: Array.isArray(feedback) ? feedback.filter(f => f.status === 'pending').length : 0,
          supportTickets: 0 // Will be implemented when support tickets are added
        });
      }
    };
    loadStats();
  }, [users, feedback, supabase]);

  // Filter users based on search and status
  const filteredUsers = Array.isArray(users) ? users.filter(user => {
    if (!user) return false;
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    // Most users don't have a status field, so default to 'active' if not set
    const userStatus = user.status || 'active';
    const matchesStatus = filterStatus === 'all' || userStatus === filterStatus;
    return matchesSearch && matchesStatus;
  }) : [];

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
      const userData = {
        name: userForm.name,
        email: userForm.email,
        phone: userForm.phone || null,
        preferences: {},
        created_at: new Date().toISOString()
      };

      // Try to insert user (mobile app users are created automatically during signup)
      const { data, error } = await supabase
        .from('users')
        .insert([userData])
        .select();

      if (error) {
        // If error is due to duplicate email (user already exists from mobile app signup)
        if (error.code === '23505' || error.message.includes('duplicate') || error.message.includes('unique')) {
          // Update existing user instead
          const { data: updatedData, error: updateError } = await supabase
            .from('users')
            .update({
              name: userForm.name,
              phone: userForm.phone || null
            })
            .eq('email', userForm.email)
            .select();
          
          if (updateError) throw updateError;
          
          notifications.showSuccess('User profile updated successfully');
          setShowCreateUser(false);
          setUserForm({ name: '', email: '', phone: '' });
          return;
        }
        throw error;
      }

      notifications.userCreated();
      setShowCreateUser(false);
      setUserForm({ name: '', email: '', phone: '' });
      
      // The real-time subscription will automatically update the UI
      if (data && data[0]) {
        console.log('✅ User created:', data[0]);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      notifications.showError('Error creating user: ' + error.message);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (userId) => {
    // First, check if user has feedback entries
    const { data: userFeedback, error: feedbackCheckError } = await supabase
      .from('feedback')
      .select('id')
      .eq('user_id', userId);

    if (feedbackCheckError) {
      console.error('Error checking feedback:', feedbackCheckError);
    }

    const hasFeedback = userFeedback && userFeedback.length > 0;
    const feedbackCount = userFeedback?.length || 0;

    // Show appropriate confirmation message
    const confirmMessage = hasFeedback
      ? `This user has ${feedbackCount} feedback entry/entries. Deleting the user will also delete all associated feedback. Are you sure you want to proceed?`
      : 'Are you sure you want to delete this user?';

    if (!window.confirm(confirmMessage)) return;

    try {
      // If user has feedback, delete it first
      if (hasFeedback) {
        const { error: feedbackDeleteError } = await supabase
          .from('feedback')
          .delete()
          .eq('user_id', userId);

        if (feedbackDeleteError) {
          throw new Error(`Failed to delete feedback: ${feedbackDeleteError.message}`);
        }
        console.log(`✅ Deleted ${feedbackCount} feedback entries for user ${userId}`);
      }

      // Now delete the user
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      
      if (hasFeedback) {
        notifications.showSuccess(`User and ${feedbackCount} feedback entry/entries deleted successfully`);
      } else {
        notifications.userDeleted();
      }
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

  // Handle admin creation
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    
    if (adminForm.password !== adminForm.confirmPassword) {
      notifications.showError('Passwords do not match');
      return;
    }

    // Validate password requirements
    const passwordValidation = validatePassword(adminForm.password, DEFAULT_PASSWORD_OPTIONS);
    if (!passwordValidation.isValid) {
      const requirements = getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS);
      notifications.showError(`Password does not meet requirements:\n\n${passwordValidation.errors.join('\n')}\n\nRequirements: ${requirements}`);
      return;
    }

    try {
      const result = await createAdminAccount({
        firstName: adminForm.firstName,
        lastName: adminForm.lastName,
        email: adminForm.email,
        password: adminForm.password,
        role: adminForm.role,
        department: adminForm.department || null,
        phone: adminForm.phone || null
      });

      if (result.success) {
        notifications.adminCreated();
        setShowCreateAdmin(false);
        setAdminForm({
          firstName: '',
          lastName: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'admin',
          department: '',
          phone: ''
        });
      } else {
        notifications.showError(result.error || 'Failed to create admin account');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      notifications.showError('Error creating admin account: ' + error.message);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">User Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage passenger accounts, drivers, and support tickets</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => setShowCreateDriver(true)}
            className="bg-white text-gray-700 px-3 md:px-4 py-2 rounded-lg border border-gray-200 
                     hover:bg-gray-50 hover:border-primary-500 flex items-center space-x-2 
                     transition-all duration-200 text-sm md:text-base font-semibold"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Bus Conductor</span>
          </button>
          <button
            onClick={() => setShowCreateUser(true)}
            className="bg-primary-500 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-primary-600 
                     flex items-center space-x-2 transition-all duration-200 text-sm md:text-base font-semibold
                     shadow-[0_2px_4px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_8px_rgba(245,158,11,0.3)]"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
          <button
            onClick={() => setShowCreateAdmin(true)}
            className="bg-white text-gray-700 px-3 md:px-4 py-2 rounded-lg border border-gray-200 
                     hover:bg-gray-50 hover:border-primary-500 flex items-center space-x-2 
                     transition-all duration-200 text-sm md:text-base font-semibold"
          >
            <Shield className="w-4 h-4" />
            <span>Create Admin</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg flex-shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{stats.totalUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
              <UserCheck className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-amber-50 rounded-lg flex-shrink-0">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Pending Feedback</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{stats.pendingFeedback}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-[22px] border border-gray-200
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex items-center">
            <div className="p-2 bg-purple-50 rounded-lg flex-shrink-0">
              <Shield className="w-5 h-5 md:w-6 md:h-6 text-primary-600" />
            </div>
            <div className="ml-3 md:ml-4 min-w-0">
              <p className="text-xs md:text-sm font-medium text-gray-600">Support Tickets</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{stats.supportTickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[22px] border border-gray-200
                      shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-4 md:space-x-8 px-4 md:px-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('users')}
              className={`py-3 md:py-4 px-1 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors duration-200 ${
                activeTab === 'users'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('drivers')}
              className={`py-3 md:py-4 px-1 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors duration-200 ${
                activeTab === 'drivers'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Drivers
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-3 md:py-4 px-1 border-b-2 font-semibold text-xs md:text-sm whitespace-nowrap transition-colors duration-200 ${
                activeTab === 'feedback'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Feedback ({feedback.length})
            </button>
          </nav>
        </div>

        <div className="p-4 md:p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg 
                           focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                           transition-all duration-200 text-sm"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 md:px-4 py-2.5 border border-gray-300 rounded-lg 
                         focus:ring-2 focus:ring-primary-500 focus:border-primary-500 
                         transition-all duration-200 text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 
                             px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-sm font-semibold">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>

          {/* Users Table */}
          {activeTab === 'users' && (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 md:px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 md:px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <Users className="w-12 h-12 text-gray-300 mb-3" />
                          <p className="text-sm font-medium text-gray-500">No users found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {searchTerm || filterStatus !== 'all' 
                              ? 'Try adjusting your search or filters' 
                              : 'Create your first user to get started'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="flex items-center min-w-0">
                            <div className="flex-shrink-0 h-8 w-8 md:h-10 md:w-10">
                              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <span className="text-xs md:text-sm font-semibold text-primary-600">
                                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3 md:ml-4 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{user.name || 'Unnamed User'}</div>
                              <div className="text-xs md:text-sm text-gray-500 truncate">ID: {user.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <div className="text-xs md:text-sm text-gray-900 truncate">{user.email || 'No email'}</div>
                          <div className="text-xs md:text-sm text-gray-500 truncate">{user.phone || 'No phone'}</div>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-xs md:text-sm text-gray-500">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <span className="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            {user.status || 'Active'}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-sm font-medium">
                          <div className="flex space-x-2">
                            <button className="text-primary-600 hover:text-primary-700 p-1 rounded-lg hover:bg-primary-50 transition-colors duration-150">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="text-gray-600 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-150">
                              <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-700 p-1 rounded-lg hover:bg-red-50 transition-colors duration-150"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
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
                      Bus Conductor
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
                                : driver.name || 'Unnamed Bus Conductor'
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
        <Modal
          onClose={() => setShowCreateDriver(false)}
          closeOnBackdrop={true}
          size="md"
          ariaLabelledby="create-driver-title"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <h3 id="create-driver-title" className="text-lg font-semibold text-gray-900">
                  Create Bus Conductor Account
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
                  aria-label="Close create bus conductor modal"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
              <form onSubmit={handleCreateDriver} className="px-6 py-3 space-y-3 overflow-y-auto">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={driverForm.firstName}
                        onChange={(e) => setDriverForm({ ...driverForm, firstName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={driverForm.lastName}
                        onChange={(e) => setDriverForm({ ...driverForm, lastName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={driverForm.email}
                      onChange={(e) => setDriverForm({ ...driverForm, email: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      required
                      value={driverForm.licenseNumber}
                      onChange={(e) => setDriverForm({ ...driverForm, licenseNumber: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={driverForm.phone}
                      onChange={(e) => setDriverForm({ ...driverForm, phone: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={driverForm.password}
                      onChange={(e) => setDriverForm({ ...driverForm, password: e.target.value })}
                      className="modern-input w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={driverForm.confirmPassword}
                      onChange={(e) => setDriverForm({ ...driverForm, confirmPassword: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={close}
                    className="modern-button btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modern-button px-4 py-2 text-sm"
                  >
                    Create Bus Conductor
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <Modal
          onClose={() => setShowCreateUser(false)}
          closeOnBackdrop={true}
          size="md"
          ariaLabelledby="create-user-title"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <h3 id="create-user-title" className="text-lg font-semibold text-gray-900">
                  Create User Account
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
                  aria-label="Close create user modal"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="px-6 py-3 space-y-3">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={userForm.email}
                      onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={close}
                    className="modern-button btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modern-button px-4 py-2 text-sm"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {/* Edit Bus Conductor Modal */}
      {showEditDriver && (
        <Modal
          onClose={() => {
            setShowEditDriver(false);
            setEditingDriver(null);
          }}
          closeOnBackdrop={true}
          size="md"
          ariaLabelledby="edit-driver-title"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <h3 id="edit-driver-title" className="text-lg font-semibold text-gray-900">
                  Edit Bus Conductor Details
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
                  aria-label="Close edit bus conductor modal"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
              <form onSubmit={handleUpdateDriver} className="px-6 py-3 space-y-3">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={editDriverForm.firstName}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, firstName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={editDriverForm.lastName}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, lastName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={editDriverForm.email}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, email: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                    <input
                      type="text"
                      required
                      value={editDriverForm.licenseNumber}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, licenseNumber: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={editDriverForm.phone}
                      onChange={(e) => setEditDriverForm({ ...editDriverForm, phone: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editDriverForm.isActive}
                        onChange={(e) => setEditDriverForm({ ...editDriverForm, isActive: e.target.checked })}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active Bus Conductor</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={close}
                    className="modern-button btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modern-button px-4 py-2 text-sm"
                  >
                    Update Bus Conductor
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {/* Create Admin Modal */}
      {showCreateAdmin && (
        <Modal
          onClose={() => setShowCreateAdmin(false)}
          closeOnBackdrop={true}
          size="md"
          ariaLabelledby="create-admin-title"
        >
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
                <h3 id="create-admin-title" className="text-lg font-semibold text-gray-900">
                  Create Admin Account
                </h3>
                <button
                  type="button"
                  onClick={close}
                  className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
                  aria-label="Close create admin modal"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>
              <form onSubmit={handleCreateAdmin} className="px-6 py-3 space-y-3 overflow-y-auto">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                      <input
                        type="text"
                        required
                        value={adminForm.firstName}
                        onChange={(e) => setAdminForm({ ...adminForm, firstName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                      <input
                        type="text"
                        required
                        value={adminForm.lastName}
                        onChange={(e) => setAdminForm({ ...adminForm, lastName: e.target.value })}
                        className="modern-input w-full"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <select
                      required
                      value={adminForm.role}
                      onChange={(e) => setAdminForm({ ...adminForm, role: e.target.value })}
                      className="modern-input w-full"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="operator">Operator</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                    <input
                      type="text"
                      value={adminForm.department}
                      onChange={(e) => setAdminForm({ ...adminForm, department: e.target.value })}
                      className="modern-input w-full"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={adminForm.phone}
                      onChange={(e) => setAdminForm({ ...adminForm, phone: e.target.value })}
                      className="modern-input w-full"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input
                      type="password"
                      required
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      className="modern-input w-full"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {getPasswordRequirements(DEFAULT_PASSWORD_OPTIONS)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <input
                      type="password"
                      required
                      value={adminForm.confirmPassword}
                      onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                      className="modern-input w-full"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={close}
                    className="modern-button btn-secondary px-4 py-2 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modern-button px-4 py-2 text-sm"
                  >
                    Create Admin
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}
    </div>
  );
};

export default UserManagement;

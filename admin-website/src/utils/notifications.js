import { toast } from 'react-hot-toast';

// Success notifications
export const showSuccess = (message, options = {}) => {
  return toast.success(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#10B981',
      color: '#fff',
      fontWeight: '500',
    },
    ...options
  });
};

// Error notifications
export const showError = (message, options = {}) => {
  return toast.error(message, {
    duration: 5000,
    position: 'top-right',
    style: {
      background: '#EF4444',
      color: '#fff',
      fontWeight: '500',
    },
    ...options
  });
};

// Info notifications
export const showInfo = (message, options = {}) => {
  return toast(message, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#3B82F6',
      color: '#fff',
      fontWeight: '500',
    },
    ...options
  });
};

// Warning notifications
export const showWarning = (message, options = {}) => {
  return toast(message, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#F59E0B',
      color: '#fff',
      fontWeight: '500',
    },
    ...options
  });
};

// Specific success messages for different operations
export const notifications = {
  // Core notification functions
  showSuccess,
  showError,
  showInfo,
  showWarning,

  // Driver operations
  driverCreated: () => showSuccess('Driver account created successfully!'),
  driverUpdated: () => showSuccess('Driver information updated successfully!'),
  driverDeleted: () => showSuccess('Driver account deleted successfully!'),
  driverActivated: () => showSuccess('Driver activated successfully!'),
  driverDeactivated: () => showSuccess('Driver deactivated successfully!'),
  driverAssigned: () => showSuccess('Driver assigned to bus successfully!'),
  driverUnassigned: () => showSuccess('Driver assignment removed successfully!'),

  // User operations
  userCreated: () => showSuccess('User account created successfully!'),
  userUpdated: () => showSuccess('User information updated successfully!'),
  userDeleted: () => showSuccess('User account deleted successfully!'),

  // Admin operations
  adminCreated: () => showSuccess('Admin account created successfully!'),
  adminUpdated: () => showSuccess('Admin information updated successfully!'),
  adminDeleted: () => showSuccess('Admin account deleted successfully!'),
  adminActivated: () => showSuccess('Admin activated successfully!'),
  adminDeactivated: () => showSuccess('Admin deactivated successfully!'),

  // Bus operations
  busCreated: () => showSuccess('Bus added to fleet successfully!'),
  busUpdated: () => showSuccess('Bus information updated successfully!'),
  busDeleted: () => showSuccess('Bus removed from fleet successfully!'),
  busLocationUpdated: () => showSuccess('Bus location updated successfully!'),

  // Route operations
  routeCreated: () => showSuccess('Route created successfully!'),
  routeUpdated: () => showSuccess('Route updated successfully!'),
  routeDeleted: () => showSuccess('Route deleted successfully!'),

  // Schedule operations
  scheduleCreated: () => showSuccess('Schedule created successfully!'),
  scheduleUpdated: () => showSuccess('Schedule updated successfully!'),
  scheduleDeleted: () => showSuccess('Schedule deleted successfully!'),

  // General operations
  dataSaved: () => showSuccess('Data saved successfully!'),
  dataUpdated: () => showSuccess('Data updated successfully!'),
  dataDeleted: () => showSuccess('Data deleted successfully!'),
  operationCompleted: () => showSuccess('Operation completed successfully!'),
};

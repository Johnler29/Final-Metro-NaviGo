import React, { useState, useEffect } from 'react';
import { X, Bus, MapPin, User, Navigation } from 'lucide-react';

const BusModal = ({ bus, routes, drivers, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    bus_number: '',
    name: '',
    capacity: 50,
    route_id: '',
    driver_id: '',
    latitude: '',
    longitude: '',
    speed: 0,
    heading: 0
  });

  const [errors, setErrors] = useState({});
  const [manualOverride, setManualOverride] = useState(false);

  useEffect(() => {
    if (bus) {
      setFormData({
        bus_number: bus.bus_number || '',
        name: bus.name || '',
        capacity: bus.capacity || 50,
        route_id: bus.route_id || '',
        driver_id: bus.driver_id || '',
        latitude: bus.latitude || '',
        longitude: bus.longitude || '',
        speed: bus.speed || 0,
        heading: bus.heading || 0
      });
    }
  }, [bus]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.bus_number.trim()) {
      newErrors.bus_number = 'Bus number is required';
    }
    
    if (!formData.name.trim()) {
      newErrors.name = 'Bus name is required';
    }
    
    if (formData.capacity < 1) {
      newErrors.capacity = 'Capacity must be at least 1';
    }
    
    if (formData.latitude && (formData.latitude < -90 || formData.latitude > 90)) {
      newErrors.latitude = 'Latitude must be between -90 and 90';
    }
    
    if (formData.longitude && (formData.longitude < -180 || formData.longitude > 180)) {
      newErrors.longitude = 'Longitude must be between -180 and 180';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    const submitData = {
      ...formData,
      capacity: parseInt(formData.capacity),
      route_id: formData.route_id || null,
      driver_id: formData.driver_id || null,
      // IMPORTANT: Don't auto-activate bus when assigning driver
      // Driver must manually go on duty to activate the bus
      // Only set to inactive if no driver assigned, otherwise preserve existing status
      status: formData.driver_id ? (formData.status || 'inactive') : 'inactive',
      tracking_status: 'stopped' // Always stopped until driver goes on duty
    };

    // Only include location fields when manual override is enabled
    if (manualOverride) {
      submitData.latitude = formData.latitude ? parseFloat(formData.latitude) : null;
      submitData.longitude = formData.longitude ? parseFloat(formData.longitude) : null;
      submitData.speed = formData.speed !== '' ? parseFloat(formData.speed) : 0;
      submitData.heading = formData.heading !== '' ? parseInt(formData.heading) : 0;
    } else {
      delete submitData.latitude;
      delete submitData.longitude;
      delete submitData.speed;
      delete submitData.heading;
    }
    
    if (bus) {
      onSave(bus.id, submitData);
    } else {
      onSave(submitData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center mr-3">
              <Bus className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              {bus ? 'Edit Bus' : 'Add New Bus'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bus Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bus Number *
              </label>
              <input
                type="text"
                name="bus_number"
                value={formData.bus_number}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.bus_number ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., 001, 002"
              />
              {errors.bus_number && (
                <p className="mt-1 text-sm text-red-600">{errors.bus_number}</p>
              )}
            </div>

            {/* Bus Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bus Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="e.g., Metro Link Bus #001"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Capacity
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                min="1"
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.capacity ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.capacity && (
                <p className="mt-1 text-sm text-red-600">{errors.capacity}</p>
              )}
            </div>


            {/* Route */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Navigation className="w-4 h-4 inline mr-1" />
                Route
              </label>
              <select
                name="route_id"
                value={formData.route_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a route</option>
                {routes.map(route => (
                  <option key={route.id} value={route.id}>
                    Route {route.route_number} - {route.origin} to {route.destination}
                  </option>
                ))}
              </select>
            </div>

            {/* Driver */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Driver
              </label>
              <select
                name="driver_id"
                value={formData.driver_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a driver</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.first_name} {driver.last_name} - {driver.license_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary-500" />
                Location Information
              </h3>
              <label className="flex items-center space-x-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={manualOverride}
                  onChange={(e) => setManualOverride(e.target.checked)}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <span>Manual override</span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mb-4">By default, live driver GPS updates the bus location. Enable manual override only for testing or corrections.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Latitude
                </label>
                <input
                  type="number"
                  name="latitude"
                  value={formData.latitude}
                  onChange={handleChange}
                  step="any"
                  disabled={!manualOverride}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.latitude ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="14.5995"
                />
                {errors.latitude && (
                  <p className="mt-1 text-sm text-red-600">{errors.latitude}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Longitude
                </label>
                <input
                  type="number"
                  name="longitude"
                  value={formData.longitude}
                  onChange={handleChange}
                  step="any"
                  disabled={!manualOverride}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.longitude ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="120.9842"
                />
                {errors.longitude && (
                  <p className="mt-1 text-sm text-red-600">{errors.longitude}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Speed (km/h)
                </label>
                <input
                  type="number"
                  name="speed"
                  value={formData.speed}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  disabled={!manualOverride}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Heading (degrees)
                </label>
                <input
                  type="number"
                  name="heading"
                  value={formData.heading}
                  onChange={handleChange}
                  min="0"
                  max="360"
                  disabled={!manualOverride}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700"
            >
              {bus ? 'Update Bus' : 'Create Bus'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BusModal;

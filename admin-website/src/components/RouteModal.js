import React, { useState, useEffect } from 'react';
import { X, Save, MapPin, DollarSign, Clock } from 'lucide-react';
import Modal from './Modal';

const RouteModal = ({ route, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    route_number: '',
    name: '',
    description: '',
    origin: '',
    destination: '',
    fare: '',
    estimated_duration: '',
    status: 'active'
  });

  useEffect(() => {
    if (route) {
      setFormData({
        route_number: route.route_number || '',
        name: route.name || '',
        description: route.description || '',
        origin: route.origin || '',
        destination: route.destination || '',
        fare: route.fare || '',
        estimated_duration: route.estimated_duration || '',
        status: route.status || 'active'
      });
    }
  }, [route]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.route_number || !formData.name) {
      alert('Please fill in all required fields');
      return;
    }

    // Prepare data for submission
    const submitData = {
      ...formData,
      fare: parseFloat(formData.fare) || 0,
      estimated_duration: parseInt(formData.estimated_duration) || 0
    };

    if (route) {
      onSave(route.id, submitData);
    } else {
      onSave(submitData);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const titleId = 'route-modal-title';

  return (
    <Modal
      onClose={onClose}
      closeOnBackdrop={true}
      size="lg"
      ariaLabelledby={titleId}
    >
      {({ close }) => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h3 id={titleId} className="text-lg font-semibold text-gray-900">
              {route ? 'Edit Route' : 'Add New Route'}
            </h3>
            <button
              type="button"
              onClick={close}
              className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
              aria-label="Close route modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-4 md:py-6 overflow-y-auto">
            <div className="space-y-4">
              {/* Route Number and Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="route_number"
                    value={formData.route_number}
                    onChange={handleChange}
                    required
                    placeholder="e.g., R001"
                    className="modern-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Dasmarinas to Alabang"
                    className="modern-input w-full"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Route description..."
                  className="modern-input w-full"
                />
              </div>

              {/* Origin and Destination */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Origin
                  </label>
                  <input
                    type="text"
                    name="origin"
                    value={formData.origin}
                    onChange={handleChange}
                    placeholder="e.g., Dasmarinas City, Cavite"
                    className="modern-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    Destination
                  </label>
                  <input
                    type="text"
                    name="destination"
                    value={formData.destination}
                    onChange={handleChange}
                    placeholder="e.g., Alabang, Muntinlupa"
                    className="modern-input w-full"
                  />
                </div>
              </div>

              {/* Fare and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Fare (₱)
                  </label>
                  <input
                    type="number"
                    name="fare"
                    value={formData.fare}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="modern-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    name="estimated_duration"
                    value={formData.estimated_duration}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                    className="modern-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="modern-input w-full"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-top border-gray-100">
              <button
                type="button"
                onClick={close}
                className="modern-button btn-secondary px-4 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="modern-button px-4 py-2 text-sm flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{route ? 'Update Route' : 'Create Route'}</span>
              </button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};

export default RouteModal;


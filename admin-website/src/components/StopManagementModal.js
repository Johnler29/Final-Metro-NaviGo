import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2, MapPin, Edit2, Navigation, Loader } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';
import { toast } from 'react-hot-toast';
import { updateRouteCoordinates } from '../utils/routeDirections';
import Modal from './Modal';

const StopManagementModal = ({ route, onClose }) => {
  const { supabase, stops, refreshData } = useSupabase();
  const [routeStops, setRouteStops] = useState([]);
  const [editingStop, setEditingStop] = useState(null);
  const [generatingRoute, setGeneratingRoute] = useState(false);
  const [newStop, setNewStop] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    sequence: 0
  });

  // Get Google Maps API key from environment
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (route) {
      const filteredStops = stops
        .filter(stop => stop.route_id === route.id)
        .sort((a, b) => (a.stop_order || a.sequence || 0) - (b.stop_order || b.sequence || 0));
      setRouteStops(filteredStops);
    }
  }, [route, stops]);

  const handleAddStop = async () => {
    if (!newStop.name || !newStop.latitude || !newStop.longitude) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('stops')
        .insert([{
          route_id: route.id,
          name: newStop.name,
          address: newStop.address,
          latitude: parseFloat(newStop.latitude),
          longitude: parseFloat(newStop.longitude),
          sequence: routeStops.length + 1
        }])
        .select();

      if (error) throw error;

      toast.success('Stop added successfully!');
      setNewStop({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        sequence: 0
      });
      await refreshData();
      
      // Auto-regenerate route path
      await handleRegenerateRoute(true);
    } catch (error) {
      toast.error('Failed to add stop: ' + error.message);
    }
  };

  const handleUpdateStop = async (stopId, updates) => {
    try {
      const { error } = await supabase
        .from('stops')
        .update(updates)
        .eq('id', stopId);

      if (error) throw error;

      toast.success('Stop updated successfully!');
      setEditingStop(null);
      await refreshData();
    } catch (error) {
      toast.error('Failed to update stop: ' + error.message);
    }
  };

  const handleDeleteStop = async (stopId) => {
    if (!window.confirm('Are you sure you want to delete this stop?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('stops')
        .delete()
        .eq('id', stopId);

      if (error) throw error;

      toast.success('Stop deleted successfully!');
      await refreshData();
      
      // Auto-regenerate route path
      await handleRegenerateRoute(true);
    } catch (error) {
      toast.error('Failed to delete stop: ' + error.message);
    }
  };

  const handleRegenerateRoute = async (silent = false) => {
    if (routeStops.length < 2) {
      if (!silent) {
        toast.error('Need at least 2 stops to generate route path');
      }
      return;
    }

    setGeneratingRoute(true);
    
    try {
      if (!silent) {
        toast.loading('Generating route path...', { id: 'generate-route' });
      }

      const success = await updateRouteCoordinates(
        route.id,
        routeStops,
        supabase,
        googleMapsApiKey
      );

      if (success) {
        if (!silent) {
          toast.success('Route path generated successfully!', { id: 'generate-route' });
        }
        await refreshData();
      } else {
        if (!silent) {
          toast.error('Failed to generate route path', { id: 'generate-route' });
        }
      }
    } catch (error) {
      console.error('Error generating route:', error);
      if (!silent) {
        toast.error('Error: ' + error.message, { id: 'generate-route' });
      }
    } finally {
      setGeneratingRoute(false);
    }
  };

  const handleReorderStop = async (stopId, newSequence) => {
    try {
      const { error } = await supabase
        .from('stops')
        .update({ sequence: newSequence })
        .eq('id', stopId);

      if (error) throw error;

      await refreshData();
    } catch (error) {
      toast.error('Failed to reorder stop: ' + error.message);
    }
  };

  const titleId = 'stop-management-modal-title';

  return (
    <Modal
      onClose={onClose}
      closeOnBackdrop={true}
      size="xl"
      ariaLabelledby={titleId}
    >
      {({ close }) => (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex-1">
              <h3 id={titleId} className="text-lg font-semibold text-gray-900">
                Manage Stops for {route?.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Route {route?.route_number} • {routeStops.length} stops
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => handleRegenerateRoute(false)}
                disabled={generatingRoute || routeStops.length < 2}
                className="flex items-center space-x-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate accurate route path following roads"
              >
                {generatingRoute ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>Generate Route Path</span>
              </button>
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center justify-center rounded-full p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 transition-colors"
                aria-label="Close stop management modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[600px] overflow-y-auto">
            {/* Add New Stop Form */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Add New Stop
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <input
                    type="text"
                    placeholder="Stop Name *"
                    value={newStop.name}
                    onChange={(e) => setNewStop({ ...newStop, name: e.target.value })}
                    className="modern-input w-full text-sm"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="Address"
                    value={newStop.address}
                    onChange={(e) => setNewStop({ ...newStop, address: e.target.value })}
                    className="modern-input w-full text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Latitude *"
                    value={newStop.latitude}
                    onChange={(e) => setNewStop({ ...newStop, latitude: e.target.value })}
                    className="modern-input w-full text-sm"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="0.000001"
                    placeholder="Longitude *"
                    value={newStop.longitude}
                    onChange={(e) => setNewStop({ ...newStop, longitude: e.target.value })}
                    className="modern-input w-full text-sm"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="modern-button px-4 py-2 text-sm flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Stop</span>
                </button>
              </div>
            </div>

            {/* Stops List */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Route Stops ({routeStops.length})
              </h4>
              {routeStops.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No stops added yet</p>
                </div>
              ) : (
                routeStops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-elevation-1 transition-shadow"
                  >
                    {editingStop === stop.id ? (
                      // Edit Mode
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            type="text"
                            defaultValue={stop.stop_name || stop.name}
                            onBlur={(e) => handleUpdateStop(stop.id, { name: e.target.value })}
                            className="modern-input w-full text-sm"
                          />
                          <input
                            type="text"
                            defaultValue={stop.stop_description || stop.address}
                            onBlur={(e) => handleUpdateStop(stop.id, { address: e.target.value })}
                            className="modern-input w-full text-sm"
                          />
                          <input
                            type="number"
                            step="0.000001"
                            defaultValue={stop.latitude}
                            onBlur={(e) => handleUpdateStop(stop.id, { latitude: parseFloat(e.target.value) })}
                            className="modern-input w-full text-sm"
                          />
                          <input
                            type="number"
                            step="0.000001"
                            defaultValue={stop.longitude}
                            onBlur={(e) => handleUpdateStop(stop.id, { longitude: parseFloat(e.target.value) })}
                            className="modern-input w-full text-sm"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => setEditingStop(null)}
                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Done
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View Mode
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-primary-700">
                              {index + 1}
                            </span>
                          </div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">
                              {stop.stop_name || stop.name}
                            </h5>
                            <p className="text-sm text-gray-500 mt-1">
                              {stop.stop_description || stop.address || 'No address'}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                              <span>Lat: {stop.latitude?.toFixed(6)}</span>
                              <span>Lng: {stop.longitude?.toFixed(6)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {index > 0 && (
                            <button
                              type="button"
                              onClick={() => handleReorderStop(stop.id, index)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Move up"
                            >
                              ↑
                            </button>
                          )}
                          {index < routeStops.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleReorderStop(stop.id, index + 2)}
                              className="text-gray-400 hover:text-gray-600"
                              title="Move down"
                            >
                              ↓
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setEditingStop(stop.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStop(stop.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
            <button
              type="button"
              onClick={close}
              className="modern-button px-4 py-2 text-sm"
            >
              Done
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

export default StopManagementModal;


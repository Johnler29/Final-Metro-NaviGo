import React from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { Bus, Navigation, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const RecentActivity = () => {
  const { buses, routes, drivers, feedback } = useSupabase();

  // Generate recent activity data
  const activities = [
    ...buses.slice(0, 3).map(bus => ({
      id: `bus-${bus.id}`,
      type: 'bus',
      title: `Bus ${bus.bus_number} status updated`,
      description: `Status changed to ${bus.status}`,
      time: bus.updated_at,
      icon: Bus,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    })),
    ...routes.slice(0, 2).map(route => ({
      id: `route-${route.id}`,
      type: 'route',
      title: `Route ${route.route_number} updated`,
      description: `${route.origin} to ${route.destination}`,
      time: route.updated_at,
      icon: Navigation,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    })),
    ...drivers.slice(0, 2).map(driver => ({
      id: `driver-${driver.id}`,
      type: 'driver',
      title: `Driver ${driver.first_name} ${driver.last_name}`,
      description: `Status: ${driver.status}`,
      time: driver.updated_at,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    })),
    ...feedback.slice(0, 2).map(fb => ({
      id: `feedback-${fb.id}`,
      type: 'feedback',
      title: 'New feedback received',
      description: fb.message?.substring(0, 50) + '...',
      time: fb.created_at,
      icon: MessageSquare,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);

  return (
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden h-full
                    hover:shadow-2xl transition-shadow duration-300">
      <div className="px-8 py-6 bg-gray-50 border-b border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <div className="p-2 bg-primary-100 rounded-xl mr-3">
            <AlertCircle className="w-5 h-5 text-primary-600" />
          </div>
          Recent Activity
        </h2>
      </div>
      <div className="p-6 max-h-[600px] overflow-y-auto">
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} 
                     className="group flex items-start space-x-4 p-4 rounded-2xl 
                              hover:bg-gray-50 transition-all duration-300 cursor-pointer
                              border border-transparent hover:border-gray-200 hover:shadow-md">
                  <div className={`p-3 rounded-2xl ${activity.bgColor} 
                                 group-hover:scale-110 transition-transform duration-300
                                 shadow-lg`}>
                    <Icon className={`w-5 h-5 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-sm font-semibold text-gray-500">No recent activity</p>
              <p className="text-xs text-gray-400 mt-1">Activity will appear here as it happens</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentActivity;

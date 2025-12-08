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
    <div className="bg-white rounded-[22px] border border-gray-200 overflow-hidden h-full
                    shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]
                    hover:shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.04)]
                    transition-shadow duration-200 flex flex-col">
      <div className="px-4 md:px-6 py-4 md:py-5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
          <div className="p-2 bg-primary-50 rounded-lg mr-3 flex-shrink-0">
            <AlertCircle className="w-5 h-5 text-primary-600" />
          </div>
          Recent Activity
        </h2>
      </div>
      <div className="p-4 md:p-6 flex-1 overflow-y-auto max-h-[600px]">
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} 
                     className="group flex items-start gap-3 p-3 md:p-4 rounded-xl 
                              hover:bg-gray-50 transition-all duration-200 cursor-pointer
                              border border-transparent hover:border-gray-200">
                  <div className={`p-2.5 md:p-3 rounded-lg ${activity.bgColor} 
                                 flex-shrink-0 transition-transform duration-200
                                 group-hover:scale-105`}>
                    <Icon className={`w-4 h-4 md:w-5 md:h-5 ${activity.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1 leading-tight">
                      {activity.title}
                    </p>
                    <p className="text-xs text-gray-600 truncate mb-2">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 md:py-12">
              <div className="bg-gray-100 w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
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

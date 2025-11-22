import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import LiveMap from '../components/LiveMap';
import MetricCard from '../components/MetricCard';
import RecentActivity from '../components/RecentActivity';
import PerformanceChart from '../components/PerformanceChart';
import { 
  Bus, 
  Users, 
  UserCheck, 
  TrendingUp, 
  MapPin,
  Clock
} from 'lucide-react';

const Dashboard = () => {
  const { buses, drivers, users, getAnalytics } = useSupabase();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getAnalytics();
        setAnalytics(data);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [getAnalytics]);

  // Calculate real-time metrics
  const activeBuses = buses.filter(bus => bus.status === 'active').length;
  const busesWithLocation = buses.filter(bus => bus.latitude && bus.longitude).length;
  const activeDrivers = drivers.filter(driver => driver.status === 'active').length;
  const totalUsers = users.length;

  // Calculate performance metrics
  const onTimePerformance = buses.length > 0 ? 
    Math.round((buses.filter(bus => bus.tracking_status === 'moving').length / buses.length) * 100) : 0;

  const metrics = [
    {
      title: 'Active Buses',
      value: activeBuses,
      total: buses.length,
      icon: Bus,
      color: 'text-amber-700',
      bgColor: 'bg-amber-50',
      change: '+2.5%',
      changeType: 'positive'
    },
    {
      title: 'Active Drivers',
      value: activeDrivers,
      total: drivers.length,
      icon: Users,
      color: 'text-green-700',
      bgColor: 'bg-green-50',
      change: '+0.8%',
      changeType: 'positive'
    },
    {
      title: 'Total Users',
      value: totalUsers,
      icon: UserCheck,
      color: 'text-purple-700',
      bgColor: 'bg-purple-50',
      change: '+5.2%',
      changeType: 'positive'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-3 border-gray-200 border-t-amber-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600 flex items-center">
              <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              Real-time overview of your operations
            </p>
          </div>
          <div className="hidden lg:block">
            <div className="bg-amber-50 rounded-xl px-6 py-4 border border-amber-100">
              <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-1">Active Now</p>
              <p className="text-2xl font-bold text-amber-900">{activeBuses + activeDrivers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 text-amber-600 mr-2" />
                  Live Bus Tracking
                </h2>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center px-3 py-1.5 bg-green-50 rounded-lg border border-green-200">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-xs font-semibold text-green-700">Real-time</span>
                  </div>
                  <div className="px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-xs font-bold text-amber-700">{busesWithLocation} Active</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="h-96 relative">
              <LiveMap buses={buses} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <RecentActivity />
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-amber-50 rounded-lg mr-3">
              <TrendingUp className="w-5 h-5 text-amber-600" />
            </div>
            Performance Overview
          </h3>
          <PerformanceChart />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg mr-3">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-semibold text-gray-900">Database Connection</span>
              </div>
              <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg">Healthy</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-semibold text-gray-900">Real-time Updates</span>
              </div>
              <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-3"></div>
                <span className="text-sm font-semibold text-gray-900">GPS Coverage</span>
              </div>
              <span className="px-3 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg">
                {busesWithLocation}/{buses.length} buses
              </span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-semibold text-gray-900">On-time Performance</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" 
                       style={{width: `${onTimePerformance}%`}}></div>
                </div>
                <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg">{onTimePerformance}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import LiveMap from '../components/LiveMap';
import MetricCard from '../components/MetricCard';
import RecentActivity from '../components/RecentActivity';
import PerformanceChart from '../components/PerformanceChart';
import Skeleton, { SkeletonMetricCard, SkeletonChart, SkeletonMap, SkeletonCard } from '../components/Skeleton';
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
      <div className="space-y-4 md:space-y-6 animate-fade-in">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1">
            <Skeleton variant="title" width="200px" height="36px" className="mb-2" />
            <Skeleton variant="text" width="300px" />
          </div>
          <Skeleton variant="card" width="150px" height="100px" className="w-full sm:w-auto" />
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <SkeletonMetricCard />
          <SkeletonMetricCard />
          <SkeletonMetricCard />
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2">
            <SkeletonMap />
          </div>
          <div className="lg:col-span-1">
            <SkeletonCard />
          </div>
        </div>

        {/* Performance Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-tight">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1 flex items-center">
            <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
            Real-time overview of your operations
          </p>
        </div>
        {/* Active Now Card - Prominent and always visible */}
        <div className="w-full sm:w-auto">
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-[22px] px-5 md:px-6 py-4 md:py-5 
                          border-2 border-amber-200 shadow-[0_2px_8px_rgba(245,158,11,0.15),0_1px_2px_rgba(245,158,11,0.1)]
                          hover:shadow-[0_4px_12px_rgba(245,158,11,0.2),0_2px_4px_rgba(245,158,11,0.15)]
                          transition-all duration-200">
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-xs md:text-sm text-amber-700 font-semibold uppercase tracking-wider">Active Now</p>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-amber-900 leading-none">{activeBuses + activeDrivers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 w-full">
        {/* Live Map */}
        <div className="lg:col-span-2 w-full min-w-0">
          <div className="bg-white rounded-[22px] border border-gray-200 overflow-hidden
                          shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)] w-full">
            <div className="px-4 md:px-6 py-4 md:py-5 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center">
                  <MapPin className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0" />
                  Live Bus Tracking
                </h2>
                <div className="flex items-center flex-wrap gap-2">
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
            <div className="h-64 sm:h-80 md:h-96 relative w-full overflow-hidden">
              <LiveMap buses={buses} />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 w-full min-w-0">
          <RecentActivity />
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 w-full">
        <div className="bg-white rounded-[22px] border border-gray-200 p-4 md:p-6
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="p-2 bg-amber-50 rounded-lg mr-3 flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-primary-600" />
            </div>
            Performance Overview
          </h3>
          <PerformanceChart />
        </div>

        <div className="bg-white rounded-[22px] border border-gray-200 p-4 md:p-6
                        shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.02)]">
          <h3 className="text-base md:text-lg font-bold text-gray-900 mb-4 md:mb-6 flex items-center">
            <div className="p-2 bg-blue-50 rounded-lg mr-3 flex-shrink-0">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 md:p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center min-w-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm font-semibold text-gray-900 truncate">Database Connection</span>
              </div>
              <span className="px-2 md:px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg flex-shrink-0 ml-2">Healthy</span>
            </div>
            
            <div className="flex items-center justify-between p-3 md:p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center min-w-0">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm font-semibold text-gray-900 truncate">Real-time Updates</span>
              </div>
              <span className="px-2 md:px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg flex-shrink-0 ml-2">Active</span>
            </div>
            
            <div className="flex items-center justify-between p-3 md:p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center min-w-0">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm font-semibold text-gray-900 truncate">GPS Coverage</span>
              </div>
              <span className="px-2 md:px-3 py-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-lg flex-shrink-0 ml-2">
                {busesWithLocation}/{buses.length} buses
              </span>
            </div>
            
            <div className="flex items-center justify-between p-3 md:p-4 bg-green-50 rounded-xl border border-green-200">
              <div className="flex items-center min-w-0 flex-1">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3 flex-shrink-0"></div>
                <span className="text-sm font-semibold text-gray-900 truncate">On-time Performance</span>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                <div className="w-16 md:w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" 
                       style={{width: `${onTimePerformance}%`}}></div>
                </div>
                <span className="px-2 md:px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-lg">{onTimePerformance}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

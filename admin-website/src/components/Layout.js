import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from './LoadingSpinner';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle page transitions
  useEffect(() => {
    setIsPageTransitioning(true);
    const timer = setTimeout(() => {
      setIsPageTransitioning(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Page content */}
        <main className="flex-1 overflow-x-hidden bg-neutral-50">
          <div 
            className={`w-full max-w-[1280px] mx-auto px-6 py-8 transition-opacity duration-300 ${
              isPageTransitioning 
                ? 'opacity-0' 
                : 'opacity-100'
            }`}
          >
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

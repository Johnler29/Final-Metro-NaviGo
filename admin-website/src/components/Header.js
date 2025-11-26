import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Menu, Bell, Search, User, LogOut, Settings } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  const { user, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="glass sticky top-0 z-40 border-b border-white/20 backdrop-blur-xl">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 
                     hover:bg-white/50 transition-all duration-300 hover:scale-105 active:scale-95"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Search */}
          <div className="hidden md:block">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="modern-input block w-80 pl-10 pr-3 py-2.5 text-sm 
                         placeholder-gray-400 focus:outline-none focus:border-primary-500 
                         focus:ring-4 focus:ring-primary-100 transition-all duration-300 
                         bg-white/80 hover:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {/* Notifications */}
          <button className="relative p-2.5 text-gray-400 hover:text-gray-700 
                           hover:bg-white/50 rounded-xl transition-all duration-300 
                           hover:scale-105 active:scale-95 group">
            <Bell className="w-5 h-5 group-hover:animate-pulse-subtle" />
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full 
                           ring-2 ring-white animate-pulse-subtle"></span>
          </button>

          {/* User menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-white/50 
                       transition-all duration-300 hover:scale-105 active:scale-95 group"
            >
              <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center 
                             justify-center shadow-elevation-2 group-hover:shadow-glow 
                             transition-all duration-300">
                <User className="w-5 h-5 text-white" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {user?.email?.split('@')[0] || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 font-medium">Administrator</p>
              </div>
            </button>

            {/* Dropdown */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 glass-card py-2 z-50 animate-scale-in 
                            shadow-elevation-3">
                <button className="flex items-center w-full px-4 py-2.5 text-sm font-medium 
                                 text-gray-700 hover:bg-white/60 transition-all duration-200 
                                 rounded-lg mx-1 group">
                  <Settings className="w-4 h-4 mr-3 text-gray-400 group-hover:text-primary-500 
                                    transition-colors" />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-200/50"></div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center w-full px-4 py-2.5 text-sm font-medium 
                           text-red-600 hover:bg-red-50/60 transition-all duration-200 
                           rounded-lg mx-1 group"
                >
                  <LogOut className="w-4 h-4 mr-3 group-hover:scale-110 transition-transform" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

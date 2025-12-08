import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import NaviGoLogo from '../components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      toast.success('Login successful!');
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <NaviGoLogo variant="icon" className="w-16 h-16" />
          </div>
        </div>
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Navi-GO Admin
          </h1>
          <p className="text-base text-gray-600">
            Sign in to manage your fleet
          </p>
        </div>
      </div>

      {/* Login Form */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 px-10 py-12">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                         text-gray-900 placeholder-gray-400 
                         focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100
                         transition-all duration-200"
                placeholder="admin@metrobus.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-300 rounded-xl 
                           text-gray-900 placeholder-gray-400 
                           focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100
                           transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 
                           hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-amber-500 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>

              <a href="#" className="text-sm font-semibold text-amber-600 hover:text-amber-500">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent 
                       rounded-xl text-base font-semibold text-white bg-amber-500 
                       hover:bg-amber-600 focus:outline-none focus:ring-4 focus:ring-amber-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Signing in...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-gray-500 font-medium">Demo Account</span>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 rounded-xl p-5 border border-blue-100">
              <div className="flex items-start">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Quick Access</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Email:</span>
                      <span className="font-mono font-semibold text-gray-900">admin@metrobus.com</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Password:</span>
                      <span className="font-mono font-semibold text-gray-900">admin123</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          © 2025 Navi-GO. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default Login;

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(false);

  useEffect(() => {
    // Get initial session and check for password recovery
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }
        
        setUser(session?.user || null);
        
        // Check if this is a password recovery session
        // When user clicks reset link and opens app, Supabase may have set a recovery session
        if (session) {
          // Check if we can update password (recovery sessions allow this)
          // Try to detect recovery by checking session metadata
          const { data: { user } } = await supabase.auth.getUser();
          
          // If session exists but we're checking for recovery, 
          // the PASSWORD_RECOVERY event will handle it
          console.log('Session loaded, checking for recovery...');
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth event:', event, 'Has session:', !!session);
        
        setUser(session?.user || null);
        setLoading(false);
        
        // Handle password recovery event
        if (event === 'PASSWORD_RECOVERY') {
          // The user has clicked the password reset link
          // Supabase has set a recovery session
          console.log('🔐 PASSWORD_RECOVERY event received - showing reset screen');
          setShowResetPassword(true);
        } else if (event === 'SIGNED_IN') {
          // When user opens app after clicking reset link, they might be signed in with recovery session
          // Check if password needs to be updated by trying to verify session type
          if (session) {
            // Recovery sessions typically require password update
            // We'll show reset screen if PASSWORD_RECOVERY event was received
            // Otherwise, clear the flag for normal sign-in
            if (!showResetPassword) {
              // Normal sign-in, not recovery
              setShowResetPassword(false);
            }
          }
        } else if (event === 'TOKEN_REFRESHED') {
          // Don't clear reset flag on token refresh - user might still be in recovery flow
        } else if (event === 'SIGNED_OUT') {
          setShowResetPassword(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      
      if (error) {
        // Improve error message for JSON parse errors
        if (error.message && error.message.includes('JSON Parse error')) {
          const improvedError = new Error('Connection error. Please check your internet connection and verify your Supabase configuration.');
          improvedError.originalError = error;
          throw improvedError;
        }
        throw error;
      }
      return data;
    } catch (error) {
      // Re-throw with better error handling
      if (error.message && error.message.includes('JSON Parse error')) {
        throw new Error('Connection error. Please check your internet connection.');
      }
      throw error;
    }
  };

  const signUp = async (email, password, userData = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: userData
      }
    });
    
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    // IMPORTANT: For mobile apps, the password reset flow works like this:
    // 1. User requests reset → Email sent with link
    // 2. User clicks link → Opens in browser (this is normal)
    // 3. Browser redirects to Supabase → Supabase processes token
    // 4. User needs to manually open the app → App detects recovery session
    // 
    // To make this work:
    // 1. Configure redirect URL in Supabase Dashboard:
    //    Authentication > URL Configuration > Redirect URLs
    //    Add: https://bukrffymmsdbpqxmdwbv.supabase.co/auth/v1/callback
    //
    // 2. When user clicks link in email:
    //    - Link opens in browser (normal behavior)
    //    - Browser goes to Supabase callback URL
    //    - Supabase sets a recovery session
    //    - User should then open the app manually
    //    - App will detect the recovery session and show ResetPasswordScreen
    //
    // Alternative: Create a web page that redirects to app deep link
    // But for now, manual app open after clicking link works
    
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://bukrffymmsdbpqxmdwbv.supabase.co';
    const redirectUrl = `${supabaseUrl}/auth/v1/callback`;
    
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    if (error) throw error;
    return data;
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    
    if (error) throw error;
    return data;
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    showResetPassword,
    setShowResetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

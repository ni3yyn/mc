// src/context/AdminAuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../config/supabase';
import { Platform, Alert } from 'react-native';

const AdminAuthContext = createContext({});

export const AdminAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    console.log('AdminAuthProvider mounted');
    
    // Check for existing session
    const getSession = async () => {
      try {
        console.log('Getting session...');
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Session result:', session ? 'Found' : 'Not found', error);
        
        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Session error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email, password) => {
    console.log('Sign in attempt for:', email);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      console.log('Sign in response:', { data, error });
      
      if (error) {
        console.error('Sign in error details:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Sign in successful:', data.user);
      return { success: true, data };
    } catch (error) {
      console.error('Unexpected error:', error);
      return { success: false, error: error.message };
    }
  };

  const signOut = async () => {
    console.log('Signing out...');
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('Sign out successful');
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  };

  // Simple admin check - just check if user exists for now
  const isAdmin = !!user;

  const value = {
    user,
    session,
    loading,
    signIn,
    signOut,
    isAdmin,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
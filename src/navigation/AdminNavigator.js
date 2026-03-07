// src/navigation/AdminNavigator.js
import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AdminAuthProvider, useAdminAuth } from '../context/AdminAuthContext';
import AdminLogin from '../screens/admin/AdminLogin';
import AdminDashboard from '../screens/admin/AdminDashboard';

const COLORS = {
  primary: '#0EB27C',
  bgDark: '#0D1B22',
};

function AdminNavigatorContent() {
  const { user, loading, isAdmin } = useAdminAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Check if user is authenticated AND is admin
  if (!user || !isAdmin) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return <AdminDashboard />;
}

export default function AdminNavigator() {
  return (
    <AdminAuthProvider>
      <AdminNavigatorContent />
    </AdminAuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
  },
});
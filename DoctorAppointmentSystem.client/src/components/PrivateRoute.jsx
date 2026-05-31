import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../layouts/MainLayout';

const PrivateRoute = ({ roles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // SuperAdmin bypasses all role-based route restrictions
  if (user?.role === 'SuperAdmin') {
    return (
      <MainLayout>
        <Outlet />
      </MainLayout>
    );
  }

  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    console.warn(`Access denied: User role "${user?.role}" not authorized for this route. Required roles:`, roles);
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <MainLayout>
      <Outlet />
    </MainLayout>
  );
};

export default PrivateRoute;

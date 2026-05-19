/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import authService from '../services/authService';
import { UserRoles, isStaffRole } from '../services/userService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Initialize user from localStorage
const initializeUser = () => {
  const storedUser = authService.getCurrentUser();
  if (storedUser) {
    try {
      const decodedToken = jwtDecode(storedUser.token);
      const currentTime = Date.now() / 1000;

      if (decodedToken.exp > currentTime) {
        return storedUser;
      } else {
        authService.logout();
      }
    } catch (error) {
      console.error('Invalid token:', error);
      authService.logout();
    }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(initializeUser);

  const login = async (email, password) => {
    const userData = await authService.login(email, password);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const hasRole = (role) => {
    return user?.role === role;
  };

  const hasAnyRole = (roles) => {
    return roles.includes(user?.role);
  };

  // New helper: Check if user is admin
  const isAdmin = () => {
    return user?.role === UserRoles.Admin;
  };

  // New helper: Check if user is clinical staff
  const isClinicalStaff = () => {
    return user?.role === UserRoles.ClinicalStaff;
  };

  // New helper: Check if user is support staff
  const isSupportStaff = () => {
    return user?.role === UserRoles.SupportStaff;
  };

  // New helper: Check if user is patient
  const isPatient = () => {
    return user?.role === UserRoles.Patient;
  };

  // New helper: Check if user is staff (not patient)
  const isStaff = () => {
    return user?.role && isStaffRole(user.role);
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user,
    loading: false,
    hasRole,
    hasAnyRole,
    // New helpers
    isAdmin,
    isClinicalStaff,
    isSupportStaff,
    isPatient,
    isStaff,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;

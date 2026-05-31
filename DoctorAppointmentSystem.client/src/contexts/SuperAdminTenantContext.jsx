/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import tenantService from '../services/tenantService';
import { useAuth } from './AuthContext';

const SuperAdminTenantContext = createContext(null);

export const useSuperAdminTenant = () => {
  const ctx = useContext(SuperAdminTenantContext);
  if (!ctx) return { tenants: [], loading: false, selectedTenant: null, selectedTenantId: null, tenantVersion: 0, selectTenant: () => {}, clearSelection: () => {}, refreshTenants: () => {} };
  return ctx;
};

const STORAGE_KEY = 'superadmin_selected_tenant';

export const SuperAdminTenantProvider = ({ children }) => {
  const { isSuperAdmin } = useAuth();

  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tenantVersion, setTenantVersion] = useState(0);

  // Restore last selection from localStorage
  const [selectedTenant, setSelectedTenantState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Fetch tenants list whenever SuperAdmin is active
  const fetchTenants = useCallback(async () => {
    if (!isSuperAdmin()) return;
    setLoading(true);
    try {
      const data = await tenantService.getAll();
      setTenants(data);
    } catch (err) {
      console.error('Failed to load tenants for SuperAdmin selector:', err);
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const selectTenant = (tenant) => {
    // tenant can be a full object or null (= "All Tenants" cross-tenant view)
    setSelectedTenantState(tenant);
    setTenantVersion(v => v + 1);
    if (tenant) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tenant));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const clearSelection = () => selectTenant(null);

  const value = {
    tenants,
    loading,
    selectedTenant,                       // full tenant object or null
    selectedTenantId: selectedTenant?.id ?? null,
    tenantVersion,                        // increments on every tenant switch — use as useEffect dep
    selectTenant,
    clearSelection,
    refreshTenants: fetchTenants,
  };

  return (
    <SuperAdminTenantContext.Provider value={value}>
      {children}
    </SuperAdminTenantContext.Provider>
  );
};

export default SuperAdminTenantContext;

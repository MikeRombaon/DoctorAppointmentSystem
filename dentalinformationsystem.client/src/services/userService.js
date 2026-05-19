import apiClient from './api';

// Role constants matching backend enum
export const UserRoles = {
  Admin: 'Admin',
  ClinicalStaff: 'ClinicalStaff',
  SupportStaff: 'SupportStaff',
  Patient: 'Patient'
};

// Role display names with descriptions
export const RoleDisplayInfo = {
  Admin: {
    name: 'Admin',
    description: 'System administrator & accounting',
    icon: '👑',
    color: '#d32f2f'
  },
  ClinicalStaff: {
    name: 'Clinical Staff',
    description: 'Dentists & hygienists',
    icon: '🏥',
    color: '#1976d2'
  },
  SupportStaff: {
    name: 'Support Staff',
    description: 'Reception & administrative',
    icon: '🗂️',
    color: '#388e3c'
  },
  Patient: {
    name: 'Patient',
    description: 'Patient portal access',
    icon: '👤',
    color: '#7b1fa2'
  }
};

// Helper to get role display name
export const getRoleDisplayName = (role) => {
  return RoleDisplayInfo[role]?.name || role;
};

// Helper to get role description
export const getRoleDescription = (role) => {
  return RoleDisplayInfo[role]?.description || '';
};

// Helper to check if user is staff (not patient)
export const isStaffRole = (role) => {
  return [UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff].includes(role);
};

export const userService = {
  getAll: async (page = 1, pageSize = 10, role = null, isActive = null) => {
    const params = { page, pageSize };
    if (role) params.role = role;
    if (isActive !== null) params.isActive = isActive;

    const response = await apiClient.get('/users', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  update: async (id, userData) => {
    const response = await apiClient.put(`/users/${id}`, userData);
    return response.data;
  },

  toggleActive: async (id) => {
    const response = await apiClient.patch(`/users/${id}/toggle-active`);
    return response.data;
  },

  resetPassword: async (id, newPassword) => {
    const response = await apiClient.post(`/users/${id}/reset-password`, { newPassword });
    return response.data;
  },

  // Get clinical staff (dentists & hygienists)
  getClinicalStaff: async () => {
    const response = await apiClient.get('/users/dentists');
    return response.data;
  },

  // Alias for backward compatibility
  getDentists: async () => {
    const response = await apiClient.get('/users/dentists');
    return response.data;
  },

  getStaff: async () => {
    const response = await apiClient.get('/users/staff');
    return response.data;
  },
};

export default userService;

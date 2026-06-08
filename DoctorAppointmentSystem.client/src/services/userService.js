import apiClient from './api';

// Role constants matching backend enum
export const UserRoles = {
  SuperAdmin: 'SuperAdmin',
  Admin: 'Admin',
  ClinicalStaff: 'ClinicalStaff',
  SupportStaff: 'SupportStaff',
  Patient: 'Patient'
};

// Role display names with descriptions
export const RoleDisplayInfo = {
  SuperAdmin: {
    name: 'Super Admin',
    description: 'Cross-tenant system administrator',
    icon: '🛡️',
    color: '#b71c1c'
  },
  Admin: {
    name: 'Admin',
    description: 'System administrator & accounting',
    icon: '👑',
    color: '#d32f2f'
  },
  ClinicalStaff: {
    name: 'Doctor',
    description: 'Doctors & medical staff',
    icon: '👨‍⚕️',
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
  return [UserRoles.SuperAdmin, UserRoles.Admin, UserRoles.ClinicalStaff, UserRoles.SupportStaff].includes(role);
};

// Helper: split "First Last" → { firstName, lastName }
const splitFullName = (fullName = '') => {
  const parts = (fullName || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
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

  create: async (userData) => {
    // create goes through auth/register (SuperAdmin/Admin only)
    const { firstName, lastName } = splitFullName(userData.fullName);
    const payload = { ...userData, firstName, lastName };
    delete payload.fullName;
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  update: async (id, userData) => {
    const { firstName, lastName } = splitFullName(userData.fullName);
    const payload = { ...userData, firstName, lastName };
    delete payload.fullName;
    delete payload.password; // update doesn't change password
    delete payload.isNew;
    const response = await apiClient.put(`/users/${id}`, payload);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/users/${id}`);
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

  // Get clinical staff (doctors)
  getClinicalStaff: async () => {
    const response = await apiClient.get('/users/doctors');
    return response.data;
  },

  // Get doctors
  getDoctors: async () => {
    const response = await apiClient.get('/users/doctors');
    return response.data;
  },

  // Alias for backward compatibility
  getDentists: async () => {
    const response = await apiClient.get('/users/doctors');
    return response.data;
  },

  getStaff: async () => {
    const response = await apiClient.get('/users/staff');
    return response.data;
  },
};

export default userService;

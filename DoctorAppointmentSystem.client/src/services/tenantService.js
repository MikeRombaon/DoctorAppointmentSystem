import apiClient from './api';

const tenantService = {
  /** Returns all tenants with subscription info (SuperAdmin only). */
  getAll: async () => {
    const response = await apiClient.get('/tenants');
    return response.data;
  },

  /** Returns a single tenant by id. */
  getById: async (id) => {
    const response = await apiClient.get(`/tenants/${id}`);
    return response.data;
  },

  /** Toggle a tenant's active state (SuperAdmin only). */
  toggleActive: async (id) => {
    const response = await apiClient.patch(`/tenants/${id}/toggle-active`);
    return response.data;
  },

  /**
   * Update subscription details for a tenant (SuperAdmin only).
   * @param {number} id
   * @param {{ subscriptionPlan: string, subscriptionExpiresAt: string|null, subscriptionNotes: string|null }} data
   */
  updateSubscription: async (id, data) => {
    const response = await apiClient.patch(`/tenants/${id}/subscription`, data);
    return response.data;
  },
};

export default tenantService;

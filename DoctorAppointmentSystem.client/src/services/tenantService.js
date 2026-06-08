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

  /**
   * Tenant admin submits a proof-of-payment.
   * @param {number} tenantId
   * @param {FormData} formData  — fields: amountPaid, currency, referenceNumber, paymentMethod, tenantNote, proofFile
   */
  submitPayment: async (tenantId, formData) => {
    const response = await apiClient.post(`/tenants/${tenantId}/payments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  /**
   * Get subscription payment submissions.
   * @param {string} status  'Pending' | 'Approved' | 'Rejected' | '' (all)
   */
  getPayments: async (status = '') => {
    const response = await apiClient.get('/tenants/payments', { params: status ? { status } : {} });
    return response.data;
  },

  /**
   * SuperAdmin approves or rejects a payment.
   * @param {number} paymentId
   * @param {{ approve: boolean, extensionMonths?: number, rejectionNote?: string }} data
   */
  reviewPayment: async (paymentId, data) => {
    const response = await apiClient.post(`/tenants/payments/${paymentId}/review`, data);
    return response.data;
  },
};

export default tenantService;

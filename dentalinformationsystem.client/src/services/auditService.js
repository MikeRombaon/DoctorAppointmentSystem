import apiClient from './api';

export const auditService = {
  getLogs: async ({ page = 1, pageSize = 50, entityType, action, userId, from, to, successOnly } = {}) => {
    const params = { page, pageSize };
    if (entityType) params.entityType = entityType;
    if (action) params.action = action;
    if (userId) params.userId = userId;
    if (from) params.from = from;
    if (to) params.to = to;
    if (successOnly !== undefined && successOnly !== null) params.successOnly = successOnly;
    const response = await apiClient.get('/audit', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/audit/${id}`);
    return response.data;
  },

  getByEntity: async (entityType, entityId) => {
    const response = await apiClient.get(`/audit/entity/${entityType}/${entityId}`);
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get('/audit/summary');
    return response.data;
  },
};

export const notificationService = {
  sendAppointmentReminder: async (appointmentId) => {
    const response = await apiClient.post(`/notifications/appointment-reminder/${appointmentId}`);
    return response.data;
  },

  sendInvoiceEmail: async (invoiceId) => {
    const response = await apiClient.post(`/notifications/invoice/${invoiceId}`);
    return response.data;
  },

  getTemplates: async () => {
    const response = await apiClient.get('/notifications/templates');
    return response.data;
  },

  getTemplate: async (id) => {
    const response = await apiClient.get(`/notifications/templates/${id}`);
    return response.data;
  },

  createTemplate: async (data) => {
    const response = await apiClient.post('/notifications/templates', data);
    return response.data;
  },

  updateTemplate: async (id, data) => {
    const response = await apiClient.put(`/notifications/templates/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id) => {
    await apiClient.delete(`/notifications/templates/${id}`);
  },
};

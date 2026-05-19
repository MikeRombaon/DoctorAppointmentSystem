import apiClient from './api';

export const recallService = {
  getAll: async ({ status = 'due', patientId, page = 1, pageSize = 20 } = {}) => {
    const params = { status, page, pageSize };
    if (patientId) params.patientId = patientId;
    const response = await apiClient.get('/recall', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/recall/${id}`);
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get('/recall/summary');
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/recall', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/recall/${id}`, data);
    return response.data;
  },

  complete: async (id, appointmentId = null) => {
    const params = {};
    if (appointmentId) params.appointmentId = appointmentId;
    const response = await apiClient.post(`/recall/${id}/complete`, null, { params });
    return response.data;
  },

  sendReminder: async (id) => {
    const response = await apiClient.post(`/recall/${id}/send-reminder`);
    return response.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/recall/${id}`);
  },
};

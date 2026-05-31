import apiClient from './api';

export const diagnosticRequestService = {
  getAll: async ({ page = 1, pageSize = 10, patientId = null, status = null, search = null } = {}) => {
    const params = { page, pageSize };
    if (patientId) params.patientId = patientId;
    if (status) params.status = status;
    if (search) params.search = search;
    const response = await apiClient.get('/diagnosticrequests', { params });
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get('/diagnosticrequests/summary');
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/diagnosticrequests/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/diagnosticrequests', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/diagnosticrequests/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/diagnosticrequests/${id}`);
    return response.data;
  },
};

export default diagnosticRequestService;

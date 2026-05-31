import apiClient from './api';

export const procedureService = {
  getAll: async ({ page = 1, pageSize = 50, search = '' } = {}) => {
    const params = { page, pageSize };
    if (search) params.search = search;
    const response = await apiClient.get('/procedures', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/procedures/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await apiClient.post('/procedures', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await apiClient.put(`/procedures/${id}`, data);
    return response.data;
  },

  toggle: async (id) => {
    const response = await apiClient.post(`/procedures/${id}/toggle`);
    return response.data;
  },

  delete: async (id) => {
    await apiClient.delete(`/procedures/${id}`);
  },
};

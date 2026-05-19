import apiClient from './api';

export const labOrderService = {
  getAll: (params = {}) =>
    apiClient.get('/laborders', { params }).then(r => r.data),

  getById: (id) =>
    apiClient.get(`/laborders/${id}`).then(r => r.data),

  getSummary: () =>
    apiClient.get('/laborders/summary').then(r => r.data),

  create: (data) =>
    apiClient.post('/laborders', data).then(r => r.data),

  update: (id, data) =>
    apiClient.put(`/laborders/${id}`, data).then(r => r.data),

  updateStatus: (id, data) =>
    apiClient.patch(`/laborders/${id}/status`, data).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/laborders/${id}`).then(r => r.data),
};

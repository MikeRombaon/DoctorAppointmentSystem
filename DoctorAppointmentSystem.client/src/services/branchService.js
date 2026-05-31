import apiClient from './api';

export const branchService = {
  getAll: (activeOnly = true) =>
    apiClient.get('/branches', { params: { activeOnly } }).then(r => r.data),

  getById: (id) =>
    apiClient.get(`/branches/${id}`).then(r => r.data),

  create: (data) =>
    apiClient.post('/branches', data).then(r => r.data),

  update: (id, data) =>
    apiClient.put(`/branches/${id}`, data).then(r => r.data),

  toggle: (id) =>
    apiClient.patch(`/branches/${id}/toggle`).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/branches/${id}`).then(r => r.data),
};

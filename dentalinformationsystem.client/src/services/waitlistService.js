import apiClient from './api';

export const waitlistService = {
  getAll: (params = {}) =>
    apiClient.get('/waitlist', { params }).then(r => r.data),

  getSummary: () =>
    apiClient.get('/waitlist/summary').then(r => r.data),

  create: (data) =>
    apiClient.post('/waitlist', data).then(r => r.data),

  update: (id, data) =>
    apiClient.put(`/waitlist/${id}`, data).then(r => r.data),

  markScheduled: (id, data) =>
    apiClient.patch(`/waitlist/${id}/schedule`, data).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/waitlist/${id}`).then(r => r.data),
};

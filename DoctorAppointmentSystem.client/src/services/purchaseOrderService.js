import apiClient from './api';

export const purchaseOrderService = {
  getAll: (params = {}) =>
    apiClient.get('/purchaseorders', { params }).then(r => r.data),

  getById: (id) =>
    apiClient.get(`/purchaseorders/${id}`).then(r => r.data),

  create: (data) =>
    apiClient.post('/purchaseorders', data).then(r => r.data),

  updateStatus: (id, status) =>
    apiClient.patch(`/purchaseorders/${id}/status`, { status }).then(r => r.data),

  receive: (id, items) =>
    apiClient.post(`/purchaseorders/${id}/receive`, { items }).then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/purchaseorders/${id}`).then(r => r.data),
};

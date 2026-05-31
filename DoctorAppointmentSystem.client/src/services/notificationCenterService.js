import apiClient from './api';

export const notificationCenterService = {
  getAll: (params = {}) =>
    apiClient.get('/notifications/inbox', { params }).then(r => r.data),

  getUnreadCount: () =>
    apiClient.get('/notifications/inbox/unread-count').then(r => r.data),

  markRead: (id) =>
    apiClient.put(`/notifications/inbox/${id}/read`).then(r => r.data),

  markAllRead: () =>
    apiClient.put('/notifications/inbox/read-all').then(r => r.data),

  delete: (id) =>
    apiClient.delete(`/notifications/inbox/${id}`).then(r => r.data),

  send: (data) =>
    apiClient.post('/notifications/inbox/send', data).then(r => r.data),
};

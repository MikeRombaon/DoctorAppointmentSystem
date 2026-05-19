import apiClient from './api';

export const reminderService = {
  trigger: (data) =>
    apiClient.post('/reminders/trigger', data).then(r => r.data),

  getLog: (params = {}) =>
    apiClient.get('/reminders/log', { params }).then(r => r.data),

  getSummary: () =>
    apiClient.get('/reminders/log/summary').then(r => r.data),
};

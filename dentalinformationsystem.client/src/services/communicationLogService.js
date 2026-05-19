import apiClient from './api';

export const communicationLogService = {
  getAll: (params = {}) =>
    apiClient.get('/communication-log', { params }).then(r => r.data),

  getById: (id) =>
    apiClient.get(`/communication-log/${id}`).then(r => r.data),

  getPatientSummary: (patientId) =>
    apiClient.get(`/communication-log/patient/${patientId}/summary`).then(r => r.data),

  getTypes: () =>
    apiClient.get('/communication-log/types').then(r => r.data),
};

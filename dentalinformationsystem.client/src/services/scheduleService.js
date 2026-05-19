import apiClient from './api';

export const scheduleService = {
  getSchedules: (params = {}) =>
    apiClient.get('/scheduling/schedules', { params }).then(r => r.data),

  upsertSchedule: (data) =>
    apiClient.post('/scheduling/schedules', data).then(r => r.data),

  deleteSchedule: (id) =>
    apiClient.delete(`/scheduling/schedules/${id}`).then(r => r.data),

  getBlocks: (params = {}) =>
    apiClient.get('/scheduling/blocks', { params }).then(r => r.data),

  createBlock: (data) =>
    apiClient.post('/scheduling/blocks', data).then(r => r.data),

  deleteBlock: (id) =>
    apiClient.delete(`/scheduling/blocks/${id}`).then(r => r.data),

  getSlots: (dentistId, date, branchId) =>
    apiClient.get('/scheduling/slots', { params: { dentistId, date, branchId } }).then(r => r.data),
};

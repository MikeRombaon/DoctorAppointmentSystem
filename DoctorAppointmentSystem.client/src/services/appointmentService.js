import apiClient from './api';

export const appointmentService = {
  getAll: async (page = 1, pageSize = 10, date = null, doctorId = null, status = null) => {
    const params = { page, pageSize };
    if (date) params.date = date;
    if (doctorId) params.doctorId = doctorId;
    if (status) params.status = status;

    const response = await apiClient.get('/appointments', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/appointments/${id}`);
    return response.data;
  },

  create: async (appointmentData) => {
    const response = await apiClient.post('/appointments', appointmentData);
    return response.data;
  },

  createWalkIn: async (walkInData) => {
    const response = await apiClient.post('/appointments/walk-in', walkInData);
    return response.data;
  },

  getWalkIns: async (date = null, page = 1, pageSize = 20) => {
    const params = { page, pageSize };
    if (date) params.date = date;

    const response = await apiClient.get('/appointments/walk-ins', { params });
    return response.data;
  },

  update: async (id, appointmentData) => {
    const response = await apiClient.put(`/appointments/${id}`, appointmentData);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/appointments/${id}/status`, status);
    return response.data;
  },

  bulkCancel: async (doctorId, date, reason) => {
    const response = await apiClient.post('/appointments/bulk-cancel', { doctorId, date, reason });
    return response.data;
  },

  getUpcoming: async (patientId = null, doctorId = null) => {
    const params = {};
    if (patientId) params.patientId = patientId;
    if (doctorId) params.doctorId = doctorId;

    const response = await apiClient.get('/appointments/upcoming', { params });
    return response.data;
  },
};

export default appointmentService;

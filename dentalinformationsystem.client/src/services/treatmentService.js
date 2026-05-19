import apiClient from './api';

export const treatmentService = {
  getAll: async (page = 1, pageSize = 10, appointmentId = null, patientId = null, status = null) => {
    const params = { page, pageSize };
    if (appointmentId) params.appointmentId = appointmentId;
    if (patientId) params.patientId = patientId;
    if (status) params.status = status;
    
    const response = await apiClient.get('/treatments', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/treatments/${id}`);
    return response.data;
  },

  create: async (treatmentData) => {
    const response = await apiClient.post('/treatments', treatmentData);
    return response.data;
  },

  update: async (id, treatmentData) => {
    const response = await apiClient.put(`/treatments/${id}`, treatmentData);
    return response.data;
  },

  complete: async (id) => {
    const response = await apiClient.patch(`/treatments/${id}/complete`);
    return response.data;
  },

  addInventoryUsage: async (id, usages) => {
    const response = await apiClient.post(`/treatments/${id}/inventory-usage`, usages);
    return response.data;
  },
};

export default treatmentService;

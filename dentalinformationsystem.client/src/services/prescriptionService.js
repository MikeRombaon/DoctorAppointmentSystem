import apiClient from './api';

export const prescriptionService = {
  getByPatient: async (patientId, includeVoided = false) => {
    const response = await apiClient.get(`/prescriptions/patient/${patientId}`, {
      params: { includeVoided }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/prescriptions/${id}`);
    return response.data;
  },

  create: async (prescriptionData) => {
    const response = await apiClient.post('/prescriptions', prescriptionData);
    return response.data;
  },

  void: async (id, reason) => {
    const response = await apiClient.post(`/prescriptions/${id}/void`, { reason });
    return response.data;
  }
};

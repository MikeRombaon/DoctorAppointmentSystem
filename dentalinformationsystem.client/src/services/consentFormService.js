import apiClient from './api';

export const consentFormService = {
  getByPatient: async (patientId) => {
    const response = await apiClient.get(`/consentforms/patient/${patientId}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/consentforms/${id}`);
    return response.data;
  },

  create: async (formData) => {
    const response = await apiClient.post('/consentforms', formData);
    return response.data;
  },

  sign: async (id, signatureData) => {
    const response = await apiClient.post(`/consentforms/${id}/sign`, signatureData);
    return response.data;
  },

  updateStatus: async (id, status) => {
    const response = await apiClient.patch(`/consentforms/${id}/status`, { status });
    return response.data;
  }
};

import apiClient from './api';

export const estimateService = {
  getByPatient: async (patientId) => {
    const response = await apiClient.get(`/estimates/patient/${patientId}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/estimates/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/estimates', data);
    return response.data;
  },
  present: async (id) => {
    const response = await apiClient.patch(`/estimates/${id}/present`);
    return response.data;
  },
  accept: async (id) => {
    const response = await apiClient.patch(`/estimates/${id}/accept`);
    return response.data;
  },
  decline: async (id) => {
    const response = await apiClient.patch(`/estimates/${id}/decline`);
    return response.data;
  },
};

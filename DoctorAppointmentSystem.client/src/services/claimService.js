import apiClient from './api';

export const claimService = {
  getByPatient: async (patientId) => {
    const response = await apiClient.get(`/claims/patient/${patientId}`);
    return response.data;
  },
  getById: async (id) => {
    const response = await apiClient.get(`/claims/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await apiClient.post('/claims', data);
    return response.data;
  },
  submit: async (id) => {
    const response = await apiClient.patch(`/claims/${id}/submit`);
    return response.data;
  },
  adjudicate: async (id, data) => {
    const response = await apiClient.patch(`/claims/${id}/adjudicate`, data);
    return response.data;
  },
  markPaid: async (id, paidAmount) => {
    const response = await apiClient.patch(`/claims/${id}/paid`, { paidAmount });
    return response.data;
  },
  void: async (id) => {
    const response = await apiClient.patch(`/claims/${id}/void`);
    return response.data;
  },
};

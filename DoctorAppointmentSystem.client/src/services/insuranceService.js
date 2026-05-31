import apiClient from './api';

export const insuranceService = {
  // Payers
  getPayers: async (activeOnly = true) => {
    const response = await apiClient.get('/insurance/payers', { params: { activeOnly } });
    return response.data;
  },
  getPayer: async (id) => {
    const response = await apiClient.get(`/insurance/payers/${id}`);
    return response.data;
  },
  createPayer: async (data) => {
    const response = await apiClient.post('/insurance/payers', data);
    return response.data;
  },
  updatePayer: async (id, data) => {
    const response = await apiClient.put(`/insurance/payers/${id}`, data);
    return response.data;
  },
  togglePayer: async (id) => {
    const response = await apiClient.patch(`/insurance/payers/${id}/toggle`);
    return response.data;
  },

  // Patient Insurance
  getPatientInsurances: async (patientId) => {
    const response = await apiClient.get(`/insurance/patient/${patientId}`);
    return response.data;
  },
  addPatientInsurance: async (data) => {
    const response = await apiClient.post('/insurance/patient', data);
    return response.data;
  },
  updatePatientInsurance: async (id, data) => {
    const response = await apiClient.put(`/insurance/patient/${id}`, data);
    return response.data;
  },
  deletePatientInsurance: async (id) => {
    const response = await apiClient.delete(`/insurance/patient/${id}`);
    return response.data;
  },
};

import apiClient from './api';

export const statementService = {
  getPatientStatement: async (patientId) => {
    const response = await apiClient.get(`/statements/patient/${patientId}`);
    return response.data;
  },
  getArAging: async () => {
    const response = await apiClient.get('/statements/aging');
    return response.data;
  },
  addAdjustment: async (data) => {
    const response = await apiClient.post('/statements/adjustments', data);
    return response.data;
  },
  getAdjustments: async (invoiceId) => {
    const response = await apiClient.get(`/statements/adjustments/${invoiceId}`);
    return response.data;
  },
};

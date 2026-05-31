import apiClient from './api';

export const medicalHistoryService = {
  getActive: async (patientId) => {
    const response = await apiClient.get(`/medicalhistory/patient/${patientId}`);
    return response.data;
  },

  getHistory: async (patientId) => {
    const response = await apiClient.get(`/medicalhistory/patient/${patientId}/history`);
    return response.data;
  },

  createOrReplace: async (historyData) => {
    const response = await apiClient.post('/medicalhistory', historyData);
    return response.data;
  },

  update: async (id, historyData) => {
    const response = await apiClient.put(`/medicalhistory/${id}`, historyData);
    return response.data;
  }
};

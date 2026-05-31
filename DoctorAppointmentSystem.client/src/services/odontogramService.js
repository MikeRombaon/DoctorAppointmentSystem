import apiClient from './api';

export const odontogramService = {
  getByPatient: async (patientId, includeInactive = false) => {
    const response = await apiClient.get(`/odontogram/patient/${patientId}`, {
      params: { includeInactive }
    });
    return response.data;
  },

  create: async (findingData) => {
    const response = await apiClient.post('/odontogram', findingData);
    return response.data;
  },

  update: async (id, findingData) => {
    const response = await apiClient.put(`/odontogram/${id}`, findingData);
    return response.data;
  },

  resolve: async (id) => {
    const response = await apiClient.delete(`/odontogram/${id}`);
    return response.data;
  }
};

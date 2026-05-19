import apiClient from './api';

export const perioExamService = {
  getByPatient: async (patientId) => {
    const response = await apiClient.get(`/perioexam/patient/${patientId}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/perioexam/${id}`);
    return response.data;
  },

  create: async (examData) => {
    const response = await apiClient.post('/perioexam', examData);
    return response.data;
  },

  updateNotes: async (id, clinicalNotes) => {
    const response = await apiClient.patch(`/perioexam/${id}/notes`, JSON.stringify(clinicalNotes), {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  }
};

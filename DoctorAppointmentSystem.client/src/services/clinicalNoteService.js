import apiClient from './api';

export const clinicalNoteService = {
  getByPatient: async (patientId, page = 1, pageSize = 20) => {
    const response = await apiClient.get(`/clinicalnotes/patient/${patientId}`, {
      params: { page, pageSize }
    });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/clinicalnotes/${id}`);
    return response.data;
  },

  create: async (noteData) => {
    const response = await apiClient.post('/clinicalnotes', noteData);
    return response.data;
  },

  update: async (id, noteData) => {
    const response = await apiClient.put(`/clinicalnotes/${id}`, noteData);
    return response.data;
  },

  sign: async (id) => {
    const response = await apiClient.post(`/clinicalnotes/${id}/sign`);
    return response.data;
  },

  amend: async (id, noteData) => {
    const response = await apiClient.post(`/clinicalnotes/${id}/amend`, noteData);
    return response.data;
  }
};

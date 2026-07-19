import apiClient from './api';

export const patientService = {
  getAll: async (page = 1, pageSize = 10, search = '', isActive = null) => {
    const params = { page, pageSize };
    if (search) params.search = search;
    if (isActive !== null) params.isActive = isActive;
    
    const response = await apiClient.get('/patients', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/patients/${id}`);
    return response.data;
  },

  create: async (patientData) => {
    const response = await apiClient.post('/patients', patientData);
    return response.data;
  },

  update: async (id, patientData) => {
    const response = await apiClient.put(`/patients/${id}`, patientData);
    return response.data;
  },

  toggleActive: async (id) => {
    const response = await apiClient.patch(`/patients/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/patients/${id}`);
    return response.data;
  },

  search: async (term) => {
    const response = await apiClient.get('/patients/search', { params: { term } });
    return response.data;
  },
};

export default patientService;

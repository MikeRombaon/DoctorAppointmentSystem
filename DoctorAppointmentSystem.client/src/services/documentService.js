import apiClient from './api';

export const documentService = {
  getByPatient: async (patientId, category = null) => {
    const params = {};
    if (category) params.category = category;
    const response = await apiClient.get(`/documents/patient/${patientId}`, { params });
    return response.data;
  },

  getOwn: async (category = null) => {
    const params = {};
    if (category) params.category = category;
    const response = await apiClient.get('/documents/my', { params });
    return response.data;
  },

  upload: async (patientId, file, category = 'General', description = '', appointmentId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (description) formData.append('description', description);
    if (appointmentId) formData.append('appointmentId', appointmentId);
    const response = await apiClient.post(`/documents/patient/${patientId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  download: async (id, fileName) => {
    const response = await apiClient.get(`/documents/${id}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/documents/${id}`);
    return response.data;
  },
};

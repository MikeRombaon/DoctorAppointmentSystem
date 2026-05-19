import apiClient from './api';

export const settingsService = {
  get: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  update: async (data) => {
    const response = await apiClient.put('/settings', data);
    return response.data;
  },
};

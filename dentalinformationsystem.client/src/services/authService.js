import apiClient from './api';

export const authService = {
  login: async (email, password) => {
    const response = await apiClient.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data));
    }
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  register: async (userData) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
};

export default authService;

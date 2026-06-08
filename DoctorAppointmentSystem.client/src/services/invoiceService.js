import apiClient from './api';

export const invoiceService = {
  getAll: async (page = 1, pageSize = 10, status = null, patientId = null) => {
    const params = { page, pageSize };
    if (status) params.status = status;
    if (patientId) params.patientId = patientId;
    
    const response = await apiClient.get('/invoices', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await apiClient.get(`/invoices/${id}`);
    return response.data;
  },

  create: async (invoiceData) => {
    const response = await apiClient.post('/invoices', invoiceData);
    return response.data;
  },

  addPayment: async (invoiceId, paymentData) => {
    const response = await apiClient.post(`/invoices/${invoiceId}/payments`, paymentData);
    return response.data;
  },

  getPending: async () => {
    const response = await apiClient.get('/invoices/pending');
    return response.data;
  },

  getOverdue: async () => {
    const response = await apiClient.get('/invoices/overdue');
    return response.data;
  },

  delete: async (id) => {
    const response = await apiClient.delete(`/invoices/${id}`);
    return response.data;
  },
};

export default invoiceService;

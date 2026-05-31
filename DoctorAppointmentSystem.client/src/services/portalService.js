import apiClient from './api';

export const portalService = {
  getSummary: async () => {
    const response = await apiClient.get('/portal/summary');
    return response.data;
  },

  getAppointments: async (status = null, page = 1, pageSize = 10) => {
    const params = { page, pageSize };
    if (status) params.status = status;
    const response = await apiClient.get('/portal/appointments', { params });
    return response.data;
  },

  getInvoices: async (page = 1, pageSize = 10) => {
    const response = await apiClient.get('/portal/invoices', { params: { page, pageSize } });
    return response.data;
  },

  getTreatments: async (page = 1, pageSize = 10) => {
    const response = await apiClient.get('/portal/treatments', { params: { page, pageSize } });
    return response.data;
  },

  getDocuments: async () => {
    const response = await apiClient.get('/portal/documents');
    return response.data;
  },
};

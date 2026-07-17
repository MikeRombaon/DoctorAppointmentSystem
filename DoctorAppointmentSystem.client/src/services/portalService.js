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

  bookAppointment: async (data) => {
    const response = await apiClient.post('/portal/appointments', data);
    return response.data;
  },

  getAvailability: async (doctorId, date, branchId = null) => {
    const params = { doctorId, date };
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/scheduling/slots', { params });
    return response.data;
  },
};

import apiClient from './api';

export const reportService = {
  getRevenue: async ({ from, to, groupBy = 'month' } = {}) => {
    const params = { groupBy };
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/revenue', { params });
    return response.data;
  },

  getAppointments: async ({ from, to, doctorId } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    if (doctorId) params.doctorId = doctorId;
    const response = await apiClient.get('/reports/appointments', { params });
    return response.data;
  },

  getTreatments: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/treatments', { params });
    return response.data;
  },

  getProviders: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/providers', { params });
    return response.data;
  },

  getPatientStats: async () => {
    const response = await apiClient.get('/reports/patients');
    return response.data;
  },

  exportRevenueCsv: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/export/revenue', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `revenue_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  exportAppointmentsCsv: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/export/appointments', { params, responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `appointments_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  getDoctorPerformance: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/clinical/doctor-performance', { params });
    return response.data;
  },

  getProcedureFrequency: async ({ from, to } = {}) => {
    const params = {};
    if (from) params.from = from;
    if (to) params.to = to;
    const response = await apiClient.get('/reports/clinical/procedure-frequency', { params });
    return response.data;
  },
};

import apiClient from './api';

export const dashboardService = {
  getOverview: async () => {
    const response = await apiClient.get('/dashboard/overview');
    return response.data;
  },

  getTodayAppointments: async () => {
    const response = await apiClient.get('/dashboard/appointments/today');
    return response.data;
  },

  getYearlyRevenue: async (year) => {
    const params = {};
    if (year) params.year = year;
    const response = await apiClient.get('/dashboard/revenue/yearly', { params });
    return response.data;
  },

  // NEW ANALYTICS ENDPOINTS
  getAgeDistribution: async () => {
    const response = await apiClient.get('/dashboard/demographics/age-distribution');
    return response.data;
  },

  getGenderDistribution: async () => {
    const response = await apiClient.get('/dashboard/demographics/gender-distribution');
    return response.data;
  },

  getAppointmentTypeDistribution: async (period = 'month') => {
    const params = { period };
    const response = await apiClient.get('/dashboard/demographics/appointment-types', { params });
    return response.data;
  },

  getTreatmentsByProcedure: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/dashboard/treatments/by-procedure', { params });
    return response.data;
  },

  getTreatmentMonthlyTrend: async (year) => {
    const params = {};
    if (year) params.year = year;
    const response = await apiClient.get('/dashboard/treatments/monthly-trend', { params });
    return response.data;
  },

  getInventoryByCategory: async () => {
    const response = await apiClient.get('/dashboard/inventory/by-category');
    return response.data;
  },

  getMostUsedInventory: async (startDate, endDate, topCount = 10) => {
    const params = { topCount };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/dashboard/inventory/most-used', { params });
    return response.data;
  },

  getAppointmentPattern: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/dashboard/appointments/pattern', { params });
    return response.data;
  },

  getRevenueBreakdown: async (startDate, endDate) => {
    const params = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/dashboard/revenue/breakdown', { params });
    return response.data;
  },

  getAdminSummary: async () => {
    const response = await apiClient.get('/dashboard/admin-summary');
    return response.data;
  },
};

export default dashboardService;

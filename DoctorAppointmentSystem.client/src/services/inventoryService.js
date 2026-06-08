import apiClient from './api';

export const inventoryService = {
  getItems: async (page = 1, pageSize = 10, category = null, search = null) => {
    const params = { page, pageSize };
    if (category) params.category = category;
    if (search) params.search = search;
    
    const response = await apiClient.get('/inventory/items', { params });
    return response.data;
  },

  getItemById: async (id) => {
    const response = await apiClient.get(`/inventory/items/${id}`);
    return response.data;
  },

  createItem: async (itemData) => {
    const response = await apiClient.post('/inventory/items', itemData);
    return response.data;
  },

  updateItem: async (id, itemData) => {
    const response = await apiClient.put(`/inventory/items/${id}`, itemData);
    return response.data;
  },

  deleteItem: async (id) => {
    const response = await apiClient.delete(`/inventory/items/${id}`);
    return response.data;
  },

  getLowStock: async () => {
    const response = await apiClient.get('/inventory/low-stock');
    return response.data;
  },

  addTransaction: async (transactionData) => {
    const response = await apiClient.post('/inventory/transactions', transactionData);
    return response.data;
  },

  issueStock: async (itemId, quantity, reason, notes) => {
    const response = await apiClient.post(`/inventory/items/${itemId}/issue`, {
      quantity,
      reason,
      notes
    });
    return response.data;
  },

  receiveStock: async (itemId, quantity, unitCost, supplierName, invoiceNumber, notes) => {
    const response = await apiClient.post(`/inventory/items/${itemId}/receive`, {
      quantity,
      unitCost,
      supplierName,
      invoiceNumber,
      notes
    });
    return response.data;
  },

  getTransactions: async (itemId = null, page = 1, pageSize = 10) => {
    const params = { page, pageSize };
    if (itemId) params.itemId = itemId;

    const response = await apiClient.get('/inventory/transactions', { params });
    return response.data;
  },

  // Alias used by PurchaseOrders.jsx: inventoryService.getAll(page, pageSize)
  getAll: async (page = 1, pageSize = 10) => {
    const response = await apiClient.get('/inventory/items', { params: { page, pageSize } });
    return response.data;
  },
};

export default inventoryService;

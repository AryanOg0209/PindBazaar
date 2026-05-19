import api from '../api/axios';
import { emitAppDataChanged } from './realtimeEvents';

export const fetchOrders = async () => {
  const response = await api.get('/orders');
  return response.data;
};

export const createOrder = async (data) => {
  const response = await api.post('/orders', data);
  emitAppDataChanged({ scope: 'orders', action: 'order-created' });
  return response.data;
};

export const updateOrderStatus = async (id, status) => {
  const response = await api.patch(`/orders/${id}/status`, { status });
  emitAppDataChanged({ scope: 'orders', action: 'order-status-updated', status });
  return response.data;
};

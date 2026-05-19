import api from '../api/axios';
import { emitAppDataChanged } from './realtimeEvents';

export const fetchListings = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await api.get(`/market?${query}`);
  return response.data;
};

export const createListing = async (data) => {
  const response = await api.post('/market', data);
  emitAppDataChanged({ scope: 'market', action: 'listing-created' });
  return response.data;
};

export const getListingById = async (id) => {
  const response = await api.get(`/market/${id}`);
  return response.data;
};

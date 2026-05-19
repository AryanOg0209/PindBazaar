import api from '../api/axios';

export const getDashboardStats   = () => api.get('/dashboard/stats').then(r => r.data);
export const getDashboardWeather = (lat, lon) => api.get('/dashboard/weather', { params: { lat, lon } }).then(r => r.data);
export const getDashboardEquipment = () => api.get('/dashboard/equipment').then(r => r.data);

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 90000,   // 90s — AI endpoints (Claude) can take 20-40s for complex prompts
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pb_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('pb_token');
      localStorage.removeItem('pb_user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 10000
});

// Attach token to all requests
API.interceptors.request.use(config => {
  const token = localStorage.getItem('janz_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (NOT 403 — eso es permiso denegado, no sesión expirada)
API.interceptors.response.use(
  res => res,
  err => {
    const status = err.response?.status;
    const url = err.config?.url || '';
    if (status === 401 && !url.includes('/prode') && !url.includes('/public')) {
      localStorage.removeItem('janz_token');
      localStorage.removeItem('janz_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;


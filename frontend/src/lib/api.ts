import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 30000 });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cdss_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('cdss_token');
      localStorage.removeItem('cdss_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

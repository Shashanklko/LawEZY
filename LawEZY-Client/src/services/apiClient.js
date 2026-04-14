import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: add tokens to every outgoing call
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('lawezy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle token expiry or errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Auto-logout if token is invalid or expired
      localStorage.removeItem('lawezy_token');
      localStorage.removeItem('lawezy_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

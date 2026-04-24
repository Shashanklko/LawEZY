import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Public endpoints that should NEVER carry a Bearer token
const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/register', '/api/system/mode'];

// Request interceptor: add tokens to every outgoing call EXCEPT public auth endpoints
apiClient.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_PATHS.some(path => config.url?.includes(path));
    
    if (!isPublic) {
      const token = localStorage.getItem('lawezy_token');
      
      // Robust check: Prevent sending the strings "null", "undefined", or mock tokens as Bearer tokens
      if (token && token !== 'null' && token !== 'undefined' && token !== 'mock-admin-token') {
        config.headers.Authorization = `Bearer ${token}`;
      }
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
      const isAuthEndpoint = PUBLIC_PATHS.some(path => error.config?.url?.includes(path));
      
      // Only trigger logout if it's NOT a public path and we are currently authenticated
      if (!isAuthEndpoint) {
        const { isAuthenticated, logout } = useAuthStore.getState();
        if (isAuthenticated) {
          console.warn('Institutional session drop detected at:', error.config?.url);
          logout();
          if (window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
            window.location.href = '/login?session=expired';
          }
        }
      }
    } else if (error.response?.status === 403) {
      console.error('🛡️ Security Governance: Access Denied to', error.config?.url);
      // Optional: alert('Access Denied: Institutional permissions required.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;

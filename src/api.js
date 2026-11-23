import axios from 'axios';

const BASE_URL = 'https://Keetobcknd.keeto.org';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach auth token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRedirectingToLogin = false;

// Response interceptor — global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const isLoginRequest = String(error?.config?.url || '').includes('/auth/login');

    // 401 = token expired, stale or revoked (e.g. after the account was updated).
    // Clear the saved session and send the user to the login page once.
    if (status === 401 && !isLoginRequest && !isRedirectingToLogin) {
      isRedirectingToLogin = true;
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage'); // zustand persisted user

      if (window.location.pathname !== '/login') {
        sessionStorage.setItem(
          'authMessage',
          'Your session has expired. Please sign in again.'
        );
        window.location.replace('/login');
      } else {
        isRedirectingToLogin = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
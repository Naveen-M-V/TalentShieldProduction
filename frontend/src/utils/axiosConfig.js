import axios from 'axios';

// Configure axios to include credentials (cookies) with requests
axios.defaults.withCredentials = true;

const authProbe = axios.create();
authProbe.defaults.withCredentials = true;

// Add request interceptor to include Authorization header
axios.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // Add Authorization header if token exists
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const isFileUpload = error.config?.url?.includes('/documents') ||
                          error.config?.headers?.['Content-Type']?.includes('multipart');

      const isAuthRequest = error.config?.url?.includes('/auth/login') ||
                            error.config?.url?.includes('/api/auth/login') ||
                            error.config?.url?.includes('/auth/signup') ||
                            error.config?.url?.includes('/api/auth/signup');

      if (!isFileUpload && !isAuthRequest && window.location.pathname !== '/login' && window.location.pathname !== '/signup') {
        const token = localStorage.getItem('auth_token');

        if (token) {
          try {
            const requestUrl = new URL(error.config?.url || '', window.location.origin);
            const origin = requestUrl.origin;
            const candidates = [`${origin}/api/auth/me`, `${origin}/auth/me`];

            for (const url of candidates) {
              const probeResp = await authProbe.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                validateStatus: () => true,
                timeout: 5000
              });

              if (probeResp.status === 200) {
                return Promise.reject(error);
              }

              if (probeResp.status !== 404) {
                break;
              }
            }
          } catch (e) {
            return Promise.reject(error);
          }
        }

        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_session');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default axios;

import axios from 'axios';

// Normalize backend URL to prevent double slashes
const normalizeUrl = (url) => {
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

// Get the backend URL based on environment
const getBackendUrl = () => {
  const url = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  console.log('Backend URL:', url);
  return normalizeUrl(url);
};

const BACKEND_URL = getBackendUrl();

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for debugging
axios.interceptors.request.use(request => {
  console.log('Request:', {
    url: request.url,
    method: request.method,
    headers: request.headers,
    withCredentials: request.withCredentials,
    data: request.data
  });
  return request;
});

// Add response interceptor for debugging
axios.interceptors.response.use(
  response => {
    console.log('Response:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    return response;
  },
  error => {
    console.error('Response Error:', {
      message: error.message,
      response: error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response',
      config: error.config ? {
        url: error.config.url,
        method: error.config.method,
        headers: error.config.headers
      } : 'No config'
    });
    return Promise.reject(error);
  }
);

// Axios default config
const axiosConfig = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: function (status) {
    return status >= 200 && status < 500;
  }
};

// Helper function to build API URLs
const buildApiUrl = (path) => {
  const url = `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
  console.log('Built API URL:', url);
  return url;
};

export const API_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;
export const API_CONFIG = axiosConfig;
export const getApiUrl = buildApiUrl; 
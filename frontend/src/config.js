import axios from 'axios';

// Normalize backend URL to prevent double slashes
const normalizeUrl = (url) => {
  return url.replace(/\/+$/, ''); // Remove trailing slashes
};

const BACKEND_URL = normalizeUrl(process.env.REACT_APP_API_URL || 'http://localhost:5000');

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

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
  return `${BACKEND_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const API_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;
export const API_CONFIG = axiosConfig;
export const getApiUrl = buildApiUrl; 
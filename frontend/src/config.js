const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Axios default config
const axiosConfig = {
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are sent with requests
  xsrfCookieName: 'sessionId',
  xsrfHeaderName: 'X-XSRF-TOKEN'
};

// Configure axios defaults
import axios from 'axios';
axios.defaults.withCredentials = true;

export const API_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;
export const API_CONFIG = axiosConfig; 
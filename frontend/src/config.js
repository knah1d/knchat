const BACKEND_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Configure axios defaults
import axios from 'axios';

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

export const API_URL = BACKEND_URL;
export const SOCKET_URL = BACKEND_URL;
export const API_CONFIG = axiosConfig; 
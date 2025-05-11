import axios from 'axios';
import { API_URL, API_CONFIG } from '../config';

// Authentication API calls
export const authService = {
  login: async (username, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/login`,
        { username, password },
        API_CONFIG
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Login failed' };
    }
  },
  
  register: async (username, password) => {
    try {
      const response = await axios.post(
        `${API_URL}/api/register`,
        { username, password },
        API_CONFIG
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Registration failed' };
    }
  },
  
  logout: async () => {
    try {
      const response = await axios.post(
        `${API_URL}/api/logout`,
        {},
        API_CONFIG
      );
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error.response?.data || { message: 'Logout failed' };
    }
  },
  
  checkAuth: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/check-auth`,
        API_CONFIG
      );
      return response.data;
    } catch (error) {
      console.error('Auth check error:', error);
      return { isAuthenticated: false };
    }
  }
};

// Message API calls
export const messageService = {
  getRecentMessages: async () => {
    try {
      const response = await axios.get(
        `${API_URL}/api/messages`,
        API_CONFIG
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error.response?.data || { message: 'Failed to fetch messages' };
    }
  }
};

// Socket service helpers
export const socketEvents = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  MESSAGE: 'message',
  TYPING_START: 'typing-start',
  TYPING_END: 'typing-end',
  TYPING_UPDATE: 'typing-update',
  PREVIOUS_MESSAGES: 'previous-messages',
  ERROR: 'error'
};

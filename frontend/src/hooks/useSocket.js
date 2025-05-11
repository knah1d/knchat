import { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../config';
import { socketEvents } from '../services/api';

/**
 * Custom React hook to manage Socket.IO connections
 * @param {string} username - User's username to identify the connection
 * @returns {Object} Socket connection and message state management
 */
export const useSocketConnection = (username) => {
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Set up socket connection
  useEffect(() => {
    if (!username) return;

    // Connect to the socket server
    socketRef.current = io(SOCKET_URL, {
      query: { username },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection events
    socketRef.current.on(socketEvents.CONNECT, () => {
      console.log('Socket connected');
      setConnectionStatus('connected');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnectionStatus('disconnected');
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Connection error. Please try again later.');
      setConnectionStatus('error');
    });

    // Load previous messages
    socketRef.current.on(socketEvents.PREVIOUS_MESSAGES, (previousMessages) => {
      console.log('Received previous messages:', previousMessages);
      setMessages(previousMessages);
    });

    // New message handler
    socketRef.current.on(socketEvents.MESSAGE, (newMessage) => {
      console.log('New message received:', newMessage);
      setMessages((prevMessages) => [...prevMessages, newMessage]);
    });

    // Typing status handler
    socketRef.current.on(socketEvents.TYPING_UPDATE, (users) => {
      console.log('Typing users:', users);
      setTypingUsers(users);
    });

    // Error handler
    socketRef.current.on(socketEvents.ERROR, (error) => {
      console.error('Socket error:', error);
      setError(error.message || 'An error occurred');
    });

    // Clean up on unmount
    return () => {
      if (socketRef.current) {
        console.log('Cleaning up socket connection');
        socketRef.current.off(socketEvents.CONNECT);
        socketRef.current.off(socketEvents.DISCONNECT);
        socketRef.current.off(socketEvents.PREVIOUS_MESSAGES);
        socketRef.current.off(socketEvents.MESSAGE);
        socketRef.current.off(socketEvents.TYPING_UPDATE);
        socketRef.current.off(socketEvents.ERROR);
        socketRef.current.disconnect();
      }
    };
  }, [username]);

  // Send a new message
  const sendMessage = useCallback((content) => {
    if (!socketRef.current || !content.trim() || !username) return;
    
    const messageData = {
      content,
      username
    };

    socketRef.current.emit(socketEvents.MESSAGE, messageData);
  }, [username]);

  // Handle typing status
  const handleTyping = useCallback((isTyping) => {
    if (!socketRef.current || !username) return;
    
    if (isTyping) {
      socketRef.current.emit(socketEvents.TYPING_START, username);
      
      // Clear any existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set a timeout to stop typing indicator after inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socketRef.current.emit(socketEvents.TYPING_END, username);
      }, 2000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socketRef.current.emit(socketEvents.TYPING_END, username);
    }
  }, [username]);

  return {
    messages,
    typingUsers,
    connectionStatus,
    error,
    sendMessage,
    handleTyping
  };
};
